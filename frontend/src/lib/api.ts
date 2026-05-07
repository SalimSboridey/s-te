const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || (!import.meta.env.VITE_API_URL && typeof window !== 'undefined' && window.location.hostname !== 'localhost');

export const token = {
  get: () => localStorage.getItem('jwt'),
  set: (t: string) => localStorage.setItem('jwt', t),
  clear: () => localStorage.removeItem('jwt'),
};

type Db = {
  user: { id: number; email: string; name: string; xp: number; level: number; dark_theme: boolean };
  sources: any[];
  columns: any[];
  vacancies: any[];
  contacts: any[];
  activities: any[];
  events: any[];
  materials: any[];
  courses: any[];
  roadmap: any[];
  credentials: any[];
  tags: any[];
  achievements: any[];
  challenges: any[];
  ids: Record<string, number>;
};

const defaults = ['На рассмотрении', 'Отклик отправлен', 'Просмотрен', 'Тестовое задание', 'Собеседование', 'Оффер', 'Отказ / Архив'];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const xpByColumn: Record<string, number> = { 'Отклик отправлен': 5, Просмотрен: 10, 'Тестовое задание': 15, Собеседование: 30, Оффер: 100 };

function freshDb(email = 'demo@local.dev', name = 'Соискатель'): Db {
  return {
    user: { id: 1, email, name, xp: 0, level: 1, dark_theme: true },
    sources: [],
    columns: defaults.map((name, i) => ({ id: i + 1, name, sort_order: i, is_archive: name.includes('Архив') })),
    vacancies: [],
    contacts: [],
    activities: [{ id: 1, type: 'demo', message: 'Демо-режим: данные хранятся в браузере, backend не требуется', created_at: now(), meta: {} }],
    events: [],
    materials: [],
    courses: [],
    roadmap: [],
    credentials: [],
    tags: [],
    achievements: [],
    challenges: [
      { id: 1, date: today(), code: 'apply_5', title: 'Откликнуться на 5 вакансий', target: 5, progress: 0, completed: false },
      { id: 2, date: today(), code: 'contacts_2', title: 'Добавить 2 контакта', target: 2, progress: 0, completed: false },
      { id: 3, date: today(), code: 'interview_1', title: 'Переместить 1 вакансию в “Собеседование”', target: 1, progress: 0, completed: false },
    ],
    ids: { activity: 2, source: 1, column: 8, vacancy: 1, contact: 1, event: 1, material: 1, course: 1, roadmap: 1, credential: 1, tag: 1 },
  };
}
function loadDb(): Db { const raw = localStorage.getItem('jobtracker-demo-db'); return raw ? JSON.parse(raw) : freshDb(); }
function saveDb(db: Db) { localStorage.setItem('jobtracker-demo-db', JSON.stringify(db)); }
function nextId(db: Db, key: string) { const id = db.ids[key] || 1; db.ids[key] = id + 1; return id; }
function log(db: Db, type: string, message: string, vacancy_id?: number, meta: Record<string, unknown> = {}) { db.activities.unshift({ id: nextId(db, 'activity'), type, message, vacancy_id, meta, created_at: now() }); }
function addXp(db: Db, amount: number) { db.user.xp += amount; db.user.level = Math.min(20, Math.floor(db.user.xp / 100) + 1); }
function bumpChallenge(db: Db, code: string) { const ch = db.challenges.find((c) => c.code === code); if (ch && !ch.completed) { ch.progress += 1; if (ch.progress >= ch.target) { ch.completed = true; addXp(db, 20); log(db, 'challenge', `Челлендж выполнен: ${ch.title}`); } } }
function award(db: Db, title: string, icon: string, description: string) { if (!db.achievements.some((a) => a.title === title)) db.achievements.push({ title, icon, description }); }

async function demoReq<T>(path: string, init: RequestInit = {}): Promise<T> {
  const db = loadDb();
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : undefined;
  const url = new URL(path, 'http://demo.local');
  const parts = url.pathname.split('/').filter(Boolean).slice(1);

  if (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login') {
    if (body?.email) db.user.email = body.email;
    if (body?.name) db.user.name = body.name;
    saveDb(db);
    return { access_token: 'demo-token' } as T;
  }
  if (url.pathname === '/api/me') return db.user as T;
  if (url.pathname === '/api/dashboard') return {
    user: db.user,
    challenges: db.challenges,
    events: db.events.slice(0, 8),
    attention: [...db.vacancies].sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at))).slice(0, 3),
    stats: { applications: db.vacancies.length, interviews: db.events.filter((e) => e.type === 'interview').length, offers: db.vacancies.filter((v) => db.columns.find((c) => c.id === v.column_id)?.name === 'Оффер').length },
    achievements: db.achievements,
  } as T;
  if (url.pathname === '/api/analytics') return {
    funnel: db.columns.map((c) => ({ name: c.name, count: db.vacancies.filter((v) => v.column_id === c.id).length })),
    sources: db.sources.map((s) => ({ name: s.name, count: db.vacancies.filter((v) => v.source_id === s.id).length })),
    heatmap: db.activities.reduce((acc: any[], a) => { const day = new Date(a.created_at).getDay().toString(); const row = acc.find((x) => x.day === day) || (acc.push({ day, count: 0 }), acc[acc.length - 1]); row.count += 1; return acc; }, []),
  } as T;
  if (url.pathname === '/api/export.csv') {
    const csv = ['title,company,link,status,source,created_at', ...db.vacancies.map((v) => [v.title, v.company, v.link, db.columns.find((c) => c.id === v.column_id)?.name || '', db.sources.find((s) => s.id === v.source_id)?.name || '', v.created_at].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n');
    return { csv } as T;
  }

  const resource = parts[0];
  const id = Number(parts[1]);
  const map: Record<string, keyof Db> = { sources: 'sources', columns: 'columns', vacancies: 'vacancies', contacts: 'contacts', activities: 'activities', events: 'events', materials: 'materials', courses: 'courses', roadmap: 'roadmap', credentials: 'credentials', tags: 'tags' };
  const key = map[resource];
  if (!key) throw new Error(`Demo API route is not implemented: ${path}`);
  const list = db[key] as any[];

  if (resource === 'vacancies' && id && parts[2] === 'move' && method === 'POST') {
    const item = list.find((x) => x.id === id);
    if (!item) throw new Error('Not found');
    const old = db.columns.find((c) => c.id === item.column_id)?.name || '';
    const col = db.columns.find((c) => c.id === body.column_id);
    item.column_id = body.column_id;
    item.updated_at = now();
    if (col?.name === 'Отклик отправлен' && !item.applied_at) item.applied_at = body.event_date || now();
    addXp(db, xpByColumn[col?.name || ''] || 0);
    if (col?.name === 'Отклик отправлен') bumpChallenge(db, 'apply_5');
    if (col?.name === 'Собеседование') { bumpChallenge(db, 'interview_1'); award(db, 'Звёздный час', '⭐', 'Первое собеседование'); }
    if (col?.name === 'Оффер') award(db, 'Взял высоту', '🏔️', 'Первый оффер');
    log(db, 'move', `${item.title}: ${old} → ${col?.name || 'Без статуса'}`, id, { note: body.note || '' });
    saveDb(db); return item as T;
  }

  if (method === 'GET') {
    if (resource === 'vacancies' && url.searchParams.get('source_id')) return list.filter((x) => x.source_id === Number(url.searchParams.get('source_id'))) as T;
    return list as T;
  }
  if (method === 'POST') {
    const idKey: Record<string, string> = { sources: 'source', columns: 'column', vacancies: 'vacancy', contacts: 'contact', events: 'event', materials: 'material', courses: 'course', roadmap: 'roadmap', credentials: 'credential', tags: 'tag' };
    const created = { ...body, id: nextId(db, idKey[resource] || resource), created_at: now(), updated_at: now() };
    if (resource === 'vacancies' && !created.column_id) created.column_id = db.columns[0]?.id;
    list.unshift(created);
    if (resource === 'contacts') { addXp(db, 5); bumpChallenge(db, 'contacts_2'); }
    if (resource === 'courses' && created.status === 'completed') { addXp(db, 50); award(db, 'Ученик чародея', '🧙', 'Завершён первый курс'); }
    log(db, resource, `Создано: ${created.title || created.name || created.label || resource}`, created.vacancy_id);
    saveDb(db); return created as T;
  }
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error('Not found');
  if (method === 'PUT') {
    Object.assign(item, body, { updated_at: now() });
    if (resource === 'courses' && body.status === 'completed') { addXp(db, 50); award(db, 'Ученик чародея', '🧙', 'Завершён первый курс'); }
    saveDb(db); return item as T;
  }
  if (method === 'DELETE') {
    const idx = list.findIndex((x) => x.id === id); if (idx >= 0) list.splice(idx, 1);
    saveDb(db); return { ok: true } as T;
  }
  throw new Error(`Unsupported demo request: ${method} ${path}`);
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (DEMO_MODE || token.get()?.startsWith('demo-')) return demoReq<T>(path, init);
  try {
    const r = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...(token.get() ? { Authorization: `Bearer ${token.get()}` } : {}), ...(init.headers || {}) } });
    if (!r.ok) throw new Error((await r.json().catch(() => ({ detail: r.statusText }))).detail);
    return r.json();
  } catch (e) {
    if (!import.meta.env.VITE_API_URL) return demoReq<T>(path, init);
    throw e;
  }
}
export const api = { login: (email: string, password: string) => req<{ access_token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }), register: (email: string, name: string, password: string) => req<{ access_token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password }) }), get: <T>(p: string) => req<T>(p), post: <T>(p: string, b: any) => req<T>(p, { method: 'POST', body: JSON.stringify(b) }), put: <T>(p: string, b: any) => req<T>(p, { method: 'PUT', body: JSON.stringify(b) }), del: <T>(p: string) => req<T>(p, { method: 'DELETE' }) };
export function csvDownload(csv: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'jobtracker.csv'; a.click(); }
