-- Parent dashboard migration
-- Run after schema.sql in Supabase SQL editor.

alter table families add column if not exists parent_user_id uuid references auth.users(id);
create index if not exists families_parent_user_id_idx on families(parent_user_id);

create table if not exists parent_updates (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid not null references families(id) on delete cascade,
  session_id           uuid not null unique references sessions(id) on delete cascade,
  lesson_id            uuid not null references lessons(id) on delete cascade,
  message_body         text not null,
  observed_stats       jsonb not null default '{}'::jsonb,
  suggested_next_steps jsonb not null default '[]'::jsonb,
  sms_status           text not null default 'pending'
                       check (sms_status in ('pending', 'sent', 'failed', 'skipped')),
  sms_sent_at          timestamptz,
  sms_error            text,
  created_at           timestamptz not null default now()
);

create index if not exists parent_updates_family_created_idx
  on parent_updates(family_id, created_at desc);
create index if not exists parent_updates_session_idx
  on parent_updates(session_id);

alter table parent_updates enable row level security;

-- A parent can only read records for a family explicitly linked to auth.uid().
drop policy if exists "parents read own families" on families;
create policy "parents read own families" on families
  for select to authenticated
  using (parent_user_id = auth.uid());

drop policy if exists "parents read own lessons" on lessons;
create policy "parents read own lessons" on lessons
  for select to authenticated
  using (exists (
    select 1 from families
    where families.id = lessons.family_id
      and families.parent_user_id = auth.uid()
  ));

drop policy if exists "parents read own sessions" on sessions;
create policy "parents read own sessions" on sessions
  for select to authenticated
  using (exists (
    select 1 from lessons
    join families on families.id = lessons.family_id
    where lessons.id = sessions.lesson_id
      and families.parent_user_id = auth.uid()
  ));

drop policy if exists "parents read own updates" on parent_updates;
create policy "parents read own updates" on parent_updates
  for select to authenticated
  using (exists (
    select 1 from families
    where families.id = parent_updates.family_id
      and families.parent_user_id = auth.uid()
  ));

-- Writes continue through the server-only service-role client after validation.
