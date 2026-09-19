-- Core schema for the AI learning app.
-- Ownership model: a parent (auth.users) owns children; every other row hangs
-- off a child. RLS lets a parent read/write only their own children's rows.
-- Background jobs use the service role and bypass RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Parents
-- ---------------------------------------------------------------------------
create table public.parents (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  tier text not null default 'free' check (tier in ('free', 'paid')),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.parents (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Children and personalization context
-- ---------------------------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  age smallint check (age between 3 and 18),
  reading_level text check (reading_level in ('pre_reader', 'early', 'developing', 'fluent', 'advanced')),
  avatar text not null default '🙂',
  created_at timestamptz not null default now()
);
create index children_parent_idx on public.children (parent_id);

create table public.personalization_context (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  kind text not null check (kind in ('interest', 'preference', 'note')),
  value text not null check (char_length(value) between 1 and 200),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index personalization_child_idx on public.personalization_context (child_id) where active;

-- ---------------------------------------------------------------------------
-- Curriculum
-- ---------------------------------------------------------------------------
create table public.curricula (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  goal_text text not null,
  title text not null default '',
  description text not null default '',
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index curricula_child_idx on public.curricula (child_id);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  position integer not null,
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  prerequisites text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (curriculum_id, slug)
);
create index topics_curriculum_idx on public.topics (curriculum_id, position);

create table public.learning_objectives (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  code text not null,
  text text not null,
  position integer not null,
  unique (topic_id, code)
);
create index objectives_topic_idx on public.learning_objectives (topic_id);

-- ---------------------------------------------------------------------------
-- Artifacts (versioned, never deleted)
-- ---------------------------------------------------------------------------
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  version integer not null,
  status text not null default 'generating' check (status in ('generating', 'published', 'failed')),
  blueprint jsonb,
  html text,
  used_fallback boolean not null default false,
  provider text,
  model text,
  prompt_version text,
  validation_report jsonb,
  error text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (topic_id, version)
);
create index artifacts_topic_idx on public.artifacts (topic_id, version desc);

-- ---------------------------------------------------------------------------
-- Sessions, events, responses
-- ---------------------------------------------------------------------------
create table public.artifact_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  nonce text not null,
  started_at timestamptz not null default now(),
  last_event_at timestamptz,
  ended_at timestamptz
);
create index sessions_child_idx on public.artifact_sessions (child_id, started_at desc);

create table public.learning_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.artifact_sessions (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  client_event_id uuid not null unique,
  type text not null,
  section_id text,
  activity_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index events_child_time_idx on public.learning_events (child_id, occurred_at desc);
create index events_topic_idx on public.learning_events (topic_id, type);

create table public.responses (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.artifact_sessions (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  activity_id text not null,
  activity_type text not null,
  question_id text not null,
  question_kind text not null,
  difficulty smallint not null,
  objective_codes text[] not null,
  answer jsonb,
  correct boolean not null,
  attempt smallint not null,
  hints_used smallint not null default 0,
  occurred_at timestamptz not null
);
create index responses_child_topic_idx on public.responses (child_id, topic_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Mastery and progress (server-computed, never by the UI)
-- ---------------------------------------------------------------------------
create table public.objective_mastery (
  child_id uuid not null references public.children (id) on delete cascade,
  objective_id uuid not null references public.learning_objectives (id) on delete cascade,
  score numeric(4,3) not null default 0,
  evidence_count integer not null default 0,
  activity_types text[] not null default '{}',
  status text not null default 'unknown' check (status in ('unknown', 'developing', 'proficient', 'mastered')),
  last_evidence_at timestamptz,
  primary key (child_id, objective_id)
);

create table public.topic_progress (
  child_id uuid not null references public.children (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'needs_review', 'completed')),
  mastery numeric(4,3) not null default 0,
  reached_end boolean not null default false,
  weak_objective_codes text[] not null default '{}',
  first_activity_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  primary key (child_id, topic_id)
);

-- ---------------------------------------------------------------------------
-- Jobs and reports
-- ---------------------------------------------------------------------------
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('curriculum', 'artifact', 'daily_report')),
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  error text,
  usage jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  run_after timestamptz not null default now()
);
create index jobs_queue_idx on public.generation_jobs (status, run_after) where status in ('queued', 'running');

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  report_date date not null,
  stats jsonb not null,
  summary text not null,
  created_at timestamptz not null default now(),
  unique (child_id, report_date)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.parents enable row level security;
alter table public.children enable row level security;
alter table public.personalization_context enable row level security;
alter table public.curricula enable row level security;
alter table public.topics enable row level security;
alter table public.learning_objectives enable row level security;
alter table public.artifacts enable row level security;
alter table public.artifact_sessions enable row level security;
alter table public.learning_events enable row level security;
alter table public.responses enable row level security;
alter table public.objective_mastery enable row level security;
alter table public.topic_progress enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.daily_reports enable row level security;

create or replace function public.owns_child(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.children c where c.id = cid and c.parent_id = auth.uid());
$$;

create or replace function public.owns_topic(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.topics t
    join public.curricula cu on cu.id = t.curriculum_id
    join public.children c on c.id = cu.child_id
    where t.id = tid and c.parent_id = auth.uid()
  );
$$;

revoke all on function public.owns_child(uuid) from public, anon;
revoke all on function public.owns_topic(uuid) from public, anon;
grant execute on function public.owns_child(uuid) to authenticated;
grant execute on function public.owns_topic(uuid) to authenticated;

create policy "parents read self" on public.parents for select using (id = auth.uid());
create policy "parents update self" on public.parents for update using (id = auth.uid());

create policy "children by owner" on public.children for all
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());

create policy "personalization by owner" on public.personalization_context for all
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

create policy "curricula by owner" on public.curricula for all
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

create policy "topics by owner" on public.topics for select
  using (exists (select 1 from public.curricula cu where cu.id = curriculum_id and public.owns_child(cu.child_id)));

create policy "objectives by owner" on public.learning_objectives for select
  using (public.owns_topic(topic_id));

create policy "artifacts by owner" on public.artifacts for select
  using (public.owns_topic(topic_id));

create policy "sessions by owner" on public.artifact_sessions for all
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

create policy "events by owner" on public.learning_events for select
  using (public.owns_child(child_id));

create policy "responses by owner" on public.responses for select
  using (public.owns_child(child_id));

create policy "mastery by owner" on public.objective_mastery for select
  using (public.owns_child(child_id));

create policy "progress by owner" on public.topic_progress for select
  using (public.owns_child(child_id));

create policy "reports by owner" on public.daily_reports for select
  using (public.owns_child(child_id));

-- generation_jobs: no client policies; service role only.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger curricula_touch before update on public.curricula
  for each row execute function public.touch_updated_at();
