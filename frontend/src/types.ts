export type Source={id:number;name:string;type:string;color:string;icon:string;url_template?:string};
export type Column={id:number;name:string;sort_order:number;is_archive:boolean};
export type Vacancy={id:number;title:string;company:string;link:string;description:string;source_id?:number;column_id?:number;applied_at?:string;notes:string;recruiter_contacts:any[];file_links:string[];created_at:string;updated_at:string;tag_ids?:number[]};
export type Contact={id:number;vacancy_id?:number;name:string;position:string;link:string;email:string;note:string;created_at:string};
export type Challenge={id:number;title:string;target:number;progress:number;completed:boolean};
export type Event={id:number;vacancy_id?:number;type:string;title:string;starts_at:string;note:string};
export type User={id:number;email:string;name:string;xp:number;level:number;dark_theme:boolean};
