from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel): email: EmailStr; name: str; password: str
class UserLogin(BaseModel): email: EmailStr; password: str
class Token(BaseModel): access_token: str; token_type: str = 'bearer'
class UserOut(BaseModel):
    id:int; email:EmailStr; name:str; xp:int; level:int; dark_theme:bool
    class Config: from_attributes=True

class SourceIn(BaseModel): name:str; type:str='website'; color:str='#6366f1'; icon:str='💼'; url_template:str|None=None
class SourceOut(SourceIn):
    id:int
    class Config: from_attributes=True

class ColumnIn(BaseModel): name:str; sort_order:int=0; is_archive:bool=False
class ColumnOut(ColumnIn):
    id:int
    class Config: from_attributes=True

class VacancyIn(BaseModel):
    title:str; company:str=''; link:str=''; description:str=''; source_id:int|None=None; column_id:int|None=None
    applied_at:datetime|None=None; notes:str=''; recruiter_contacts:list[dict[str,Any]]=[]; file_links:list[str]=[]; tag_ids:list[int]=[]
class VacancyOut(VacancyIn):
    id:int; created_at:datetime; updated_at:datetime; tags:list[Any]=[]
    class Config: from_attributes=True
class MoveVacancy(BaseModel): column_id:int; note:str=''; event_date:datetime|None=None

class ContactIn(BaseModel): vacancy_id:int|None=None; name:str; position:str=''; link:str=''; email:str=''; note:str=''
class ContactOut(ContactIn):
    id:int; created_at:datetime
    class Config: from_attributes=True

class ActivityOut(BaseModel):
    id:int; vacancy_id:int|None; type:str; message:str; meta:dict[str,Any]; created_at:datetime
    class Config: from_attributes=True

class EventIn(BaseModel): vacancy_id:int|None=None; type:str='interview'; title:str; starts_at:datetime; note:str=''
class EventOut(EventIn):
    id:int
    class Config: from_attributes=True

class ChallengeOut(BaseModel):
    id:int; date:date; code:str; title:str; target:int; progress:int; completed:bool
    class Config: from_attributes=True

class MaterialIn(BaseModel): vacancy_id:int|None=None; title:str; link:str=''; type:str='article'; tags:list[str]=[]; status:str='planned'
class MaterialOut(MaterialIn):
    id:int
    class Config: from_attributes=True

class CourseIn(BaseModel): title:str; platform:str=''; start_date:date|None=None; end_date:date|None=None; link:str=''; status:str='enrolled'; certificate_url:str=''
class CourseOut(CourseIn):
    id:int
    class Config: from_attributes=True

class RoadmapIn(BaseModel): title:str; tasks:list[dict[str,Any]]=[]; progress:int=0
class RoadmapOut(RoadmapIn):
    id:int
    class Config: from_attributes=True

class CredentialIn(BaseModel): source_id:int|None=None; label:str; encrypted_blob:dict[str,Any]
class CredentialOut(CredentialIn):
    id:int; updated_at:datetime
    class Config: from_attributes=True

class TagIn(BaseModel): name:str; color:str='#64748b'
class TagOut(TagIn):
    id:int
    class Config: from_attributes=True
