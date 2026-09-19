-- schema.sql
-- Paste into the Supabase SQL editor. Access is server-side with the service role key.
-- RLS is on with no policies so the anon/publishable key cannot read child data;
-- the service role key still has full access.

create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,          -- E.164, from Twilio
  code        text not null unique,          -- 6 chars, kid types this
  child_name  text not null,
  child_age   int  not null default 8,
  created_at  timestamptz default now()
);

create table if not exists lessons (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  topic       text not null,                 -- parent's verbatim request
  status      text not null default 'generating',  -- generating | ready | failed
  roadmap     jsonb,                         -- ["Lesson 1: ...", "Lesson 2: ...", ...]
  artifact    jsonb,                         -- LessonArtifact, null until ready
  created_at  timestamptz default now()
);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references lessons(id) on delete cascade,
  progress    jsonb not null default '{"completed":[],"answers":{},"reflection":""}',
  started_at  timestamptz default now(),
  ended_at    timestamptz,
  debrief     text
);

alter table families enable row level security;
alter table lessons enable row level security;
alter table sessions enable row level security;
