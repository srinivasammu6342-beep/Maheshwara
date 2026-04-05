/** Client config — run `npm start`, open http://localhost:3000 (no secrets here).
 *  This project is saved on disk as-is; you do not need Cursor’s “Accept” for these files. */
window.MNS_CONFIG = {
  apiBase: "",
  adminPassword: "Nexalify@2026",
  /** When testing on localhost, share/copy links use this site + current path. When live, window.location.href is used. */
  publicSiteUrl: "https://nexalifynucleus.in",
  /** Footer / floating share — set your official profile URLs */
  socialInstagram: "https://www.instagram.com/",
};

/*
Supabase `news` — full schema (new project) or ALTERs (existing):

create table news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  sub_headline text,
  category text default 'General',
  author_name text,
  location text,
  video_url text,
  image_url text,
  gallery_json jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Existing table: add missing columns:
-- alter table news add column if not exists sub_headline text;
-- alter table news add column if not exists category text default 'General';
-- alter table news add column if not exists author_name text;
-- alter table news add column if not exists location text;
-- alter table news add column if not exists video_url text;
-- alter table news add column if not exists gallery_json jsonb default '[]'::jsonb;

All reads/writes use server.js + SUPABASE_KEY in .env (no public anon in config.js).

--- Flash ticker, ads, visitor counter (run in Supabase SQL):

create table if not exists flash_news (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz default now()
);

create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link_url text,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists visitor_stats (
  id smallint primary key default 1,
  total_visits bigint not null default 0,
  day_key text,
  day_visits bigint not null default 0
);

insert into visitor_stats (id, total_visits, day_key, day_visits)
values (1, 0, null, 0)
on conflict (id) do nothing;

-- If RLS is on, add policies for your anon/service role, or use SUPABASE_SERVICE_ROLE_KEY in .env for server.js.
*/
