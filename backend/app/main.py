import os, re
from pathlib import Path
from typing import Type
from fastapi import Depends, FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from .database import Base, engine, get_db
from .auth import create_access_token, current_user, hash_password, verify_password
from . import models as m, schemas as s
from .services import add_xp, award, bump_challenge, challenges_for_today, ensure_achievements, handle_column_move, handle_course_update, log, seed_user

Base.metadata.create_all(bind=engine)
app = FastAPI(title='JobTracker API')
origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
Path('uploads').mkdir(exist_ok=True)
app.mount('/uploads', StaticFiles(directory='uploads'), name='uploads')

@app.on_event('startup')
def startup():
    db = next(get_db()); ensure_achievements(db); db.commit(); db.close()

def owned(db:Session, model:Type, user_id:int, item_id:int):
    obj = db.get(model, item_id)
    if not obj or obj.user_id != user_id: raise HTTPException(404, 'Not found')
    return obj

def update_obj(obj, data:dict):
    for k,v in data.items(): setattr(obj,k,v)

@app.post('/api/auth/register', response_model=s.Token)
def register(data:s.UserCreate, db:Session=Depends(get_db)):
    if db.query(m.User).filter_by(email=data.email).first(): raise HTTPException(400,'Email already exists')
    user=m.User(email=data.email,name=data.name,password_hash=hash_password(data.password)); db.add(user); db.flush(); seed_user(db,user); log(db,user.id,'register','Добро пожаловать в JobTracker') ; db.commit(); db.refresh(user)
    return {'access_token':create_access_token(user)}
@app.post('/api/auth/login', response_model=s.Token)
def login(data:s.UserLogin, db:Session=Depends(get_db)):
    user=db.query(m.User).filter_by(email=data.email).first()
    if not user or not verify_password(data.password,user.password_hash): raise HTTPException(401,'Invalid credentials')
    return {'access_token':create_access_token(user)}
@app.get('/api/me', response_model=s.UserOut)
def me(user:m.User=Depends(current_user)): return user

@app.get('/api/dashboard')
def dashboard(db:Session=Depends(get_db), user:m.User=Depends(current_user)):
    challenges=challenges_for_today(db,user)
    events=db.query(m.Event).filter(m.Event.user_id==user.id).order_by(m.Event.starts_at).limit(8).all()
    vacancies=db.query(m.Vacancy).filter_by(user_id=user.id).order_by(m.Vacancy.updated_at).limit(3).all()
    stats={'applications': db.query(m.Vacancy).filter_by(user_id=user.id).count(), 'interviews': db.query(m.Event).filter_by(user_id=user.id,type='interview').count(), 'offers': db.query(m.Vacancy).join(m.KanbanColumn, m.Vacancy.column_id==m.KanbanColumn.id).filter(m.Vacancy.user_id==user.id,m.KanbanColumn.name=='Оффер').count()}
    ach=db.query(m.UserAchievement).filter_by(user_id=user.id).all()
    return {'user':s.UserOut.model_validate(user),'challenges':[s.ChallengeOut.model_validate(c) for c in challenges], 'events':[s.EventOut.model_validate(e) for e in events], 'attention':[s.VacancyOut.model_validate(v) for v in vacancies], 'stats':stats, 'achievements':[{'title':a.achievement.title,'icon':a.achievement.icon,'description':a.achievement.description} for a in ach]}

@app.get('/api/sources', response_model=list[s.SourceOut])
def list_sources(db:Session=Depends(get_db), user:m.User=Depends(current_user)): return db.query(m.Source).filter_by(user_id=user.id).all()
@app.post('/api/sources', response_model=s.SourceOut)
def create_source(data:s.SourceIn, db:Session=Depends(get_db), user:m.User=Depends(current_user)):
    obj=m.Source(user_id=user.id, **data.model_dump()); db.add(obj); log(db,user.id,'source','Создан источник '+obj.name); db.commit(); db.refresh(obj); return obj
@app.put('/api/sources/{id}', response_model=s.SourceOut)
def upd_source(id:int,data:s.SourceIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    obj=owned(db,m.Source,user.id,id); update_obj(obj,data.model_dump()); db.commit(); return obj
@app.delete('/api/sources/{id}')
def del_source(id:int,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    db.delete(owned(db,m.Source,user.id,id)); db.commit(); return {'ok':True}

@app.get('/api/columns', response_model=list[s.ColumnOut])
def columns(db:Session=Depends(get_db), user:m.User=Depends(current_user)): return db.query(m.KanbanColumn).filter_by(user_id=user.id).order_by(m.KanbanColumn.sort_order).all()
@app.post('/api/columns', response_model=s.ColumnOut)
def create_col(data:s.ColumnIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    obj=m.KanbanColumn(user_id=user.id,**data.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj
@app.put('/api/columns/{id}', response_model=s.ColumnOut)
def upd_col(id:int,data:s.ColumnIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    obj=owned(db,m.KanbanColumn,user.id,id); update_obj(obj,data.model_dump()); db.commit(); return obj
@app.delete('/api/columns/{id}')
def del_col(id:int,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    db.delete(owned(db,m.KanbanColumn,user.id,id)); db.commit(); return {'ok':True}

@app.get('/api/vacancies', response_model=list[s.VacancyOut])
def vacancies(source_id:int|None=None, db:Session=Depends(get_db), user:m.User=Depends(current_user)):
    q=db.query(m.Vacancy).filter_by(user_id=user.id)
    if source_id: q=q.filter_by(source_id=source_id)
    return q.order_by(m.Vacancy.updated_at.desc()).all()
@app.post('/api/vacancies', response_model=s.VacancyOut)
def create_vac(data:s.VacancyIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    d=data.model_dump(); tag_ids=d.pop('tag_ids',[])
    if not d.get('column_id'):
        col=db.query(m.KanbanColumn).filter_by(user_id=user.id).order_by(m.KanbanColumn.sort_order).first(); d['column_id']=col.id if col else None
    obj=m.Vacancy(user_id=user.id,**d); obj.tags=db.query(m.Tag).filter(m.Tag.user_id==user.id,m.Tag.id.in_(tag_ids)).all() if tag_ids else []
    db.add(obj); db.flush(); log(db,user.id,'create','Создана вакансия '+obj.title,obj.id); db.commit(); db.refresh(obj); return obj
@app.put('/api/vacancies/{id}', response_model=s.VacancyOut)
def upd_vac(id:int,data:s.VacancyIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    obj=owned(db,m.Vacancy,user.id,id); d=data.model_dump(); tag_ids=d.pop('tag_ids',[]); update_obj(obj,d); obj.tags=db.query(m.Tag).filter(m.Tag.user_id==user.id,m.Tag.id.in_(tag_ids)).all() if tag_ids else []; log(db,user.id,'update','Обновлена вакансия '+obj.title,obj.id); db.commit(); return obj
@app.post('/api/vacancies/{id}/move', response_model=s.VacancyOut)
def move_vac(id:int,data:s.MoveVacancy,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    obj=owned(db,m.Vacancy,user.id,id); col=owned(db,m.KanbanColumn,user.id,data.column_id); old=obj.column.name if obj.column else ''; obj.column_id=col.id
    if col.name == 'Отклик отправлен' and not obj.applied_at: obj.applied_at=data.event_date
    log(db,user.id,'move',f'{obj.title}: {old} → {col.name}',obj.id,{'note':data.note}); handle_column_move(db,user,obj,col); db.commit(); db.refresh(obj); return obj
@app.delete('/api/vacancies/{id}')
def del_vac(id:int,db:Session=Depends(get_db),user:m.User=Depends(current_user)): db.delete(owned(db,m.Vacancy,user.id,id)); db.commit(); return {'ok':True}

@app.get('/api/contacts', response_model=list[s.ContactOut])
def contacts(search:str='',db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    q=db.query(m.Contact).filter_by(user_id=user.id)
    if search: q=q.filter(m.Contact.name.ilike(f'%{search}%'))
    return q.order_by(m.Contact.created_at.desc()).all()
@app.post('/api/contacts', response_model=s.ContactOut)
def create_contact(data:s.ContactIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    obj=m.Contact(user_id=user.id,**data.model_dump()); db.add(obj); add_xp(db,user,5); bump_challenge(db,user,'contacts_2'); log(db,user.id,'contact','Добавлен контакт '+obj.name,obj.vacancy_id); db.commit(); db.refresh(obj); return obj

@app.get('/api/activities', response_model=list[s.ActivityOut])
def activities(source_id:int|None=None,status_id:int|None=None,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    q=db.query(m.Activity).filter_by(user_id=user.id)
    if source_id or status_id: q=q.outerjoin(m.Vacancy, m.Activity.vacancy_id==m.Vacancy.id)
    if source_id: q=q.filter(m.Vacancy.source_id==source_id)
    if status_id: q=q.filter(m.Vacancy.column_id==status_id)
    return q.order_by(m.Activity.created_at.desc()).limit(200).all()

@app.get('/api/events', response_model=list[s.EventOut])
def events(db:Session=Depends(get_db),user:m.User=Depends(current_user)): return db.query(m.Event).filter_by(user_id=user.id).order_by(m.Event.starts_at).all()
@app.post('/api/events', response_model=s.EventOut)
def create_event(data:s.EventIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    obj=m.Event(user_id=user.id,**data.model_dump()); db.add(obj); log(db,user.id,'event','Добавлено событие '+obj.title,obj.vacancy_id); db.commit(); db.refresh(obj); return obj

@app.get('/api/materials', response_model=list[s.MaterialOut])
def materials(db:Session=Depends(get_db),user:m.User=Depends(current_user)): return db.query(m.Material).filter_by(user_id=user.id).all()
@app.post('/api/materials', response_model=s.MaterialOut)
def create_material(data:s.MaterialIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)): obj=m.Material(user_id=user.id,**data.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj
@app.put('/api/materials/{id}', response_model=s.MaterialOut)
def upd_material(id:int,data:s.MaterialIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)): obj=owned(db,m.Material,user.id,id); update_obj(obj,data.model_dump()); db.commit(); return obj

@app.get('/api/courses', response_model=list[s.CourseOut])
def courses(db:Session=Depends(get_db),user:m.User=Depends(current_user)): return db.query(m.Course).filter_by(user_id=user.id).all()
@app.post('/api/courses', response_model=s.CourseOut)
def create_course(data:s.CourseIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)): obj=m.Course(user_id=user.id,**data.model_dump()); db.add(obj); db.flush(); handle_course_update(db,user,obj,None); db.commit(); db.refresh(obj); return obj
@app.put('/api/courses/{id}', response_model=s.CourseOut)
def upd_course(id:int,data:s.CourseIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)): obj=owned(db,m.Course,user.id,id); old=obj.status; update_obj(obj,data.model_dump()); handle_course_update(db,user,obj,old); db.commit(); return obj

@app.get('/api/roadmap', response_model=list[s.RoadmapOut])
def roadmap(db:Session=Depends(get_db),user:m.User=Depends(current_user)): return db.query(m.RoadmapGoal).filter_by(user_id=user.id).all()
@app.post('/api/roadmap', response_model=s.RoadmapOut)
def create_goal(data:s.RoadmapIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)): obj=m.RoadmapGoal(user_id=user.id,**data.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@app.get('/api/credentials', response_model=list[s.CredentialOut])
def credentials(db:Session=Depends(get_db),user:m.User=Depends(current_user)): return db.query(m.Credential).filter_by(user_id=user.id).all()
@app.post('/api/credentials', response_model=s.CredentialOut)
def create_cred(data:s.CredentialIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)): obj=m.Credential(user_id=user.id,**data.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj
@app.put('/api/credentials/{id}', response_model=s.CredentialOut)
def upd_cred(id:int,data:s.CredentialIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)): obj=owned(db,m.Credential,user.id,id); update_obj(obj,data.model_dump()); db.commit(); return obj
@app.delete('/api/credentials/{id}')
def del_cred(id:int,db:Session=Depends(get_db),user:m.User=Depends(current_user)): db.delete(owned(db,m.Credential,user.id,id)); db.commit(); return {'ok':True}

@app.get('/api/tags', response_model=list[s.TagOut])
def tags(db:Session=Depends(get_db),user:m.User=Depends(current_user)): return db.query(m.Tag).filter_by(user_id=user.id).all()
@app.post('/api/tags', response_model=s.TagOut)
def create_tag(data:s.TagIn,db:Session=Depends(get_db),user:m.User=Depends(current_user)): obj=m.Tag(user_id=user.id,**data.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@app.post('/api/upload')
def upload(file:UploadFile=File(...), user:m.User=Depends(current_user)):
    safe=re.sub(r'[^a-zA-Z0-9._-]','_',file.filename or 'file'); path=Path('uploads')/f'u{user.id}_{safe}'
    path.write_bytes(file.file.read()); return {'url':'/'+str(path)}
@app.get('/api/analytics')
def analytics(db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    by_col=db.query(m.KanbanColumn.name, func.count(m.Vacancy.id)).outerjoin(m.Vacancy, (m.Vacancy.column_id==m.KanbanColumn.id)&(m.Vacancy.user_id==user.id)).filter(m.KanbanColumn.user_id==user.id).group_by(m.KanbanColumn.name).all()
    by_source=db.query(m.Source.name, func.count(m.Vacancy.id)).outerjoin(m.Vacancy, (m.Vacancy.source_id==m.Source.id)&(m.Vacancy.user_id==user.id)).filter(m.Source.user_id==user.id).group_by(m.Source.name).all()
    heat=db.query(func.strftime('%w',m.Activity.created_at) if engine.url.drivername.startswith('sqlite') else func.extract('dow',m.Activity.created_at), func.count(m.Activity.id)).filter_by(user_id=user.id).group_by(1).all()
    return {'funnel':[{'name':n,'count':c} for n,c in by_col], 'sources':[{'name':n,'count':c} for n,c in by_source], 'heatmap':[{'day':str(d),'count':c} for d,c in heat]}
@app.get('/api/export.csv')
def export_csv(db:Session=Depends(get_db),user:m.User=Depends(current_user)):
    import csv, io
    out=io.StringIO(); w=csv.writer(out); w.writerow(['title','company','link','status','source','created_at'])
    for v in db.query(m.Vacancy).filter_by(user_id=user.id).all(): w.writerow([v.title,v.company,v.link,v.column.name if v.column else '',v.source.name if v.source else '',v.created_at.isoformat()])
    return {'csv':out.getvalue()}
