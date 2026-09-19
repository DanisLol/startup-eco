-- Multi-child parent dashboard migration
-- Run after schema.sql and schema-parent-dashboard.sql.

create table if not exists children (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  name       text not null,
  age        int not null check (age between 2 and 18),
  created_at timestamptz not null default now()
);

create index if not exists children_family_created_idx
  on children(family_id, created_at);

alter table lessons add column if not exists child_id uuid references children(id) on delete cascade;
create index if not exists lessons_child_created_idx on lessons(child_id, created_at desc);

-- Preserve the original single-child family model by creating a profile for
-- every existing family and assigning its lessons to that profile.
insert into children (family_id, name, age)
select f.id, f.child_name, f.child_age
from families f
where not exists (
  select 1 from children c where c.family_id = f.id
);

update lessons l
set child_id = c.id
from children c
where c.family_id = l.family_id
  and l.child_id is null;

alter table children enable row level security;

drop policy if exists "parents read own children" on children;
create policy "parents read own children" on children
  for select to authenticated
  using (exists (
    select 1 from families
    where families.id = children.family_id
      and families.parent_user_id = auth.uid()
  ));

-- Parent-created profiles are inserted through the server-only service role
-- after checking the authenticated parent owns the family.

create or replace function create_primary_child_for_family()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into children (family_id, name, age)
  values (new.id, new.child_name, new.child_age);
  return new;
end;
$$;

drop trigger if exists families_create_primary_child on families;
create trigger families_create_primary_child
after insert on families
for each row execute function create_primary_child_for_family();
