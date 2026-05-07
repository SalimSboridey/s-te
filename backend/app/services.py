from datetime import date, datetime, timezone
import random
from sqlalchemy import func
from sqlalchemy.orm import Session
from .models import Achievement, Activity, Course, DailyChallenge, KanbanColumn, User, UserAchievement, Vacancy

DEFAULT_COLUMNS = ['На рассмотрении', 'Отклик отправлен', 'Просмотрен', 'Тестовое задание', 'Собеседование', 'Оффер', 'Отказ / Архив']
ACHIEVEMENTS = [
 ('machine_gunner','Пулемётчик','10 откликов за день','🔥'),('heavy_fire','Шквальный огонь','100 откликов за день','💥'),
 ('first_blood','First blood','Отклик на вакансию младше 15 минут','🩸'),('star_hour','Звёздный час','Первое собеседование','⭐'),
 ('took_height','Взял высоту','Первый оффер','🏔️'),('apprentice','Ученик чародея','Завершён первый курс','🧙'),
 ('cert_mage','Сертификатный маг','Загружено 3 сертификата','📜'),('iron_will','Железная воля','Выполнены все челленджи дня','🦾')]
CHALLENGE_POOL = [('apply_5','Откликнуться на 5 вакансий',5),('contacts_2','Добавить 2 контакта',2),('interview_1','Переместить 1 вакансию в “Собеседование”',1),('learn_15','Потратить 15 минут на курс',1)]
XP_BY_COLUMN = {'Отклик отправлен':5,'Просмотрен':10,'Тестовое задание':15,'Собеседование':30,'Оффер':100}

def level_for_xp(xp:int)->int: return min(20, xp // 100 + 1)
def add_xp(db:Session, user:User, amount:int):
    if amount <= 0: return
    user.xp += amount; user.level = level_for_xp(user.xp); db.add(user)

def log(db:Session, user_id:int, type:str, message:str, vacancy_id:int|None=None, meta:dict|None=None):
    db.add(Activity(user_id=user_id, type=type, message=message, vacancy_id=vacancy_id, meta=meta or {}))

def seed_user(db:Session, user:User):
    for i, name in enumerate(DEFAULT_COLUMNS):
        db.add(KanbanColumn(user_id=user.id, name=name, sort_order=i, is_archive='Архив' in name))
    ensure_achievements(db); db.commit()

def ensure_achievements(db:Session):
    for code,title,desc,icon in ACHIEVEMENTS:
        if not db.query(Achievement).filter_by(code=code).first(): db.add(Achievement(code=code,title=title,description=desc,icon=icon))

def award(db:Session, user:User, code:str):
    ach = db.query(Achievement).filter_by(code=code).first()
    if ach and not db.query(UserAchievement).filter_by(user_id=user.id, achievement_id=ach.id).first():
        db.add(UserAchievement(user_id=user.id, achievement_id=ach.id)); log(db,user.id,'achievement',f'Получена ачивка: {ach.title}')

def challenges_for_today(db:Session, user:User):
    today = datetime.now(timezone.utc).date()
    rows = db.query(DailyChallenge).filter_by(user_id=user.id, date=today).all()
    if len(rows) >= 3: return rows
    for code,title,target in random.sample(CHALLENGE_POOL, 3):
        if not db.query(DailyChallenge).filter_by(user_id=user.id, date=today, code=code).first():
            db.add(DailyChallenge(user_id=user.id, date=today, code=code, title=title, target=target))
    db.commit()
    return db.query(DailyChallenge).filter_by(user_id=user.id, date=today).all()

def bump_challenge(db:Session, user:User, code:str, amount:int=1):
    for ch in challenges_for_today(db,user):
        if ch.code == code and not ch.completed:
            ch.progress += amount
            if ch.progress >= ch.target:
                ch.completed = True
                if not ch.xp_awarded:
                    add_xp(db,user,20); ch.xp_awarded = True; log(db,user.id,'challenge',f'Челлендж выполнен: {ch.title}')
    today_rows = db.query(DailyChallenge).filter_by(user_id=user.id, date=datetime.now(timezone.utc).date()).all()
    if len(today_rows) >= 3 and all(c.completed for c in today_rows): award(db,user,'iron_will')

def handle_column_move(db:Session, user:User, vacancy:Vacancy, col:KanbanColumn):
    xp = XP_BY_COLUMN.get(col.name, 0); add_xp(db,user,xp)
    if col.name == 'Отклик отправлен': bump_challenge(db,user,'apply_5'); check_daily_applications(db,user)
    if col.name == 'Собеседование': bump_challenge(db,user,'interview_1'); award(db,user,'star_hour')
    if col.name == 'Оффер': award(db,user,'took_height')

def check_daily_applications(db:Session, user:User):
    today = date.today()
    count = db.query(func.count(Activity.id)).filter(Activity.user_id==user.id, Activity.type=='move', func.date(Activity.created_at)==today).count()
    if count >= 10: award(db,user,'machine_gunner')
    if count >= 100: award(db,user,'heavy_fire')

def handle_course_update(db:Session, user:User, course:Course, old_status:str|None):
    if course.status == 'completed' and old_status != 'completed':
        add_xp(db,user,50); award(db,user,'apprentice'); bump_challenge(db,user,'learn_15')
    cert_count = db.query(Course).filter(Course.user_id==user.id, Course.certificate_url!='').count()
    if cert_count >= 3: award(db,user,'cert_mage')
