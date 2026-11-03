create table public.fnancier_state (
  id integer primary key check (id = 1),
  version bigint not null default 0 check (version >= 0),
  state jsonb not null default '{"tasks":[],"roles":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.fnancier_schedules (
  id text primary key check (char_length(id) between 1 and 100),
  title text not null check (char_length(title) between 1 and 100),
  schedule_date date not null,
  schedule_time time not null,
  owner text not null check (char_length(owner) between 1 and 40),
  status text not null check (status in ('todo', 'doing', 'done')),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fnancier_schedules_date_idx on public.fnancier_schedules(schedule_date);
create index fnancier_schedules_owner_date_idx on public.fnancier_schedules(owner, schedule_date);

create table public.fnancier_positions (
  member_name text primary key check (char_length(member_name) between 1 and 40),
  position text not null default '' check (char_length(position) <= 80),
  updated_at timestamptz not null default now()
);

comment on table public.fnancier_schedules is 'F낭시에 대시보드에서 추가·수정한 일정. status: todo=예정, doing=진행 중, done=완료.';
comment on table public.fnancier_positions is 'F낭시에 팀원별 포지션.';
comment on table public.fnancier_state is '공용 일정 스냅샷과 동시 수정 충돌 확인 버전. 서버 전용.';

alter table public.fnancier_state enable row level security;
alter table public.fnancier_schedules enable row level security;
alter table public.fnancier_positions enable row level security;
revoke all on public.fnancier_state, public.fnancier_schedules, public.fnancier_positions from public, anon, authenticated;
grant select, insert, update, delete on public.fnancier_state, public.fnancier_schedules, public.fnancier_positions to service_role;

insert into public.fnancier_state(id) values (1);

create function public.fnancier_write_state(p_expected_version bigint, p_state jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_version bigint;
  saved_at timestamptz := clock_timestamp();
begin
  if p_expected_version is null or p_expected_version < 0
    or p_state is null
    or jsonb_typeof(p_state->'tasks') is distinct from 'array'
    or jsonb_typeof(p_state->'roles') is distinct from 'object'
    or jsonb_array_length(p_state->'tasks') > 1000 then
    raise exception 'invalid_dashboard_state' using errcode = '22023';
  end if;

  select version into current_version from public.fnancier_state where id = 1 for update;
  if current_version is null then
    raise exception 'dashboard_not_initialized';
  end if;
  if current_version <> p_expected_version then
    raise exception 'dashboard_version_conflict' using errcode = 'P0001';
  end if;

  delete from public.fnancier_schedules as existing
  where not exists (
    select 1 from jsonb_array_elements(p_state->'tasks') as item
    where item->>'id' = existing.id
  );
  insert into public.fnancier_schedules(id, title, schedule_date, schedule_time, owner, status, note, updated_at)
  select item->>'id', item->>'title', (item->>'date')::date,
         (item->>'time')::time, item->>'owner', item->>'status', coalesce(item->>'note',''), saved_at
  from jsonb_array_elements(p_state->'tasks') as item
  on conflict (id) do update set
    title = excluded.title, schedule_date = excluded.schedule_date,
    schedule_time = excluded.schedule_time, owner = excluded.owner,
    status = excluded.status, note = excluded.note, updated_at = excluded.updated_at
  where (fnancier_schedules.title, fnancier_schedules.schedule_date, fnancier_schedules.schedule_time,
         fnancier_schedules.owner, fnancier_schedules.status, fnancier_schedules.note)
    is distinct from
        (excluded.title, excluded.schedule_date, excluded.schedule_time,
         excluded.owner, excluded.status, excluded.note);

  delete from public.fnancier_positions as existing
  where not (p_state->'roles' ? existing.member_name);
  insert into public.fnancier_positions(member_name, position, updated_at)
  select key, value, saved_at from jsonb_each_text(p_state->'roles')
  on conflict (member_name) do update set position = excluded.position, updated_at = excluded.updated_at
  where fnancier_positions.position is distinct from excluded.position;

  update public.fnancier_state
  set version = current_version + 1, state = p_state, updated_at = saved_at where id = 1;
  return jsonb_build_object('version', current_version + 1, 'state', p_state, 'updatedAt', saved_at);
end;
$$;

revoke all on function public.fnancier_write_state(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.fnancier_write_state(bigint, jsonb) to service_role;
