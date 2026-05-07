from datetime import datetime, date
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    password_hash = Column(String(255), nullable=False)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    dark_theme = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Source(Base):
    __tablename__ = 'sources'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    name = Column(String(120), nullable=False)
    type = Column(String(40), default='website')
    color = Column(String(20), default='#6366f1')
    icon = Column(String(20), default='💼')
    url_template = Column(String(500), nullable=True)

class KanbanColumn(Base):
    __tablename__ = 'kanban_columns'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    name = Column(String(120), nullable=False)
    sort_order = Column(Integer, default=0)
    is_archive = Column(Boolean, default=False)

class Vacancy(Base):
    __tablename__ = 'vacancies'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    source_id = Column(Integer, ForeignKey('sources.id'), nullable=True)
    column_id = Column(Integer, ForeignKey('kanban_columns.id'), nullable=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), default='')
    link = Column(String(1000), default='')
    description = Column(Text, default='')
    applied_at = Column(DateTime, nullable=True)
    notes = Column(Text, default='')
    recruiter_contacts = Column(JSON, default=list)
    file_links = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source = relationship('Source')
    column = relationship('KanbanColumn')
    tags = relationship('Tag', secondary='vacancy_tags')

class Contact(Base):
    __tablename__ = 'contacts'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    vacancy_id = Column(Integer, ForeignKey('vacancies.id'), nullable=True)
    name = Column(String(150), nullable=False)
    position = Column(String(150), default='')
    link = Column(String(500), default='')
    email = Column(String(255), default='')
    note = Column(Text, default='')
    created_at = Column(DateTime, default=datetime.utcnow)
    vacancy = relationship('Vacancy')

class Activity(Base):
    __tablename__ = 'activities'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    vacancy_id = Column(Integer, ForeignKey('vacancies.id'), nullable=True)
    type = Column(String(80), nullable=False)
    message = Column(Text, nullable=False)
    meta = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    vacancy = relationship('Vacancy')

class Event(Base):
    __tablename__ = 'events'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    vacancy_id = Column(Integer, ForeignKey('vacancies.id'), nullable=True)
    type = Column(String(80), nullable=False)
    title = Column(String(255), nullable=False)
    starts_at = Column(DateTime, nullable=False)
    note = Column(Text, default='')
    vacancy = relationship('Vacancy')

class Achievement(Base):
    __tablename__ = 'achievements'
    id = Column(Integer, primary_key=True)
    code = Column(String(80), unique=True, nullable=False)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    icon = Column(String(20), default='🏅')

class UserAchievement(Base):
    __tablename__ = 'user_achievements'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    achievement_id = Column(Integer, ForeignKey('achievements.id'), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)
    achievement = relationship('Achievement')
    __table_args__ = (UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement'),)

class DailyChallenge(Base):
    __tablename__ = 'daily_challenges'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    date = Column(Date, default=date.today, index=True)
    code = Column(String(80), nullable=False)
    title = Column(String(255), nullable=False)
    target = Column(Integer, default=1)
    progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    xp_awarded = Column(Boolean, default=False)
    __table_args__ = (UniqueConstraint('user_id', 'date', 'code', name='uq_daily_challenge'),)

class Material(Base):
    __tablename__ = 'materials'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    vacancy_id = Column(Integer, ForeignKey('vacancies.id'), nullable=True)
    title = Column(String(255), nullable=False)
    link = Column(String(1000), default='')
    type = Column(String(40), default='article')
    tags = Column(JSON, default=list)
    status = Column(String(40), default='planned')

class Course(Base):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    platform = Column(String(120), default='')
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    link = Column(String(1000), default='')
    status = Column(String(40), default='enrolled')
    certificate_url = Column(String(1000), default='')

class RoadmapGoal(Base):
    __tablename__ = 'roadmap_goals'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    tasks = Column(JSON, default=list)
    progress = Column(Integer, default=0)

class Credential(Base):
    __tablename__ = 'credentials'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    source_id = Column(Integer, ForeignKey('sources.id'), nullable=True)
    label = Column(String(255), nullable=False)
    encrypted_blob = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source = relationship('Source')

class Tag(Base):
    __tablename__ = 'tags'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    name = Column(String(80), nullable=False)
    color = Column(String(20), default='#64748b')
    __table_args__ = (UniqueConstraint('user_id', 'name', name='uq_user_tag'),)

class VacancyTag(Base):
    __tablename__ = 'vacancy_tags'
    vacancy_id = Column(Integer, ForeignKey('vacancies.id'), primary_key=True)
    tag_id = Column(Integer, ForeignKey('tags.id'), primary_key=True)
