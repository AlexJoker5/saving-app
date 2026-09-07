begin;
-- A single row keeps expense/Main changes atomic.
create table public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint workspace_shape check (
    (jsonb_typeof(state) = 'object'
      and state ->> 'version' = '1'
      and jsonb_typeof(state -> 'demo') = 'boolean'
      and jsonb_typeof(state -> 'mainId') = 'string'
      and jsonb_typeof(state -> 'budget') = 'number'
      and jsonb_typeof(state -> 'plans') = 'array'
      and jsonb_typeof(state -> 'expenses') = 'array'
      and jsonb_typeof(state -> 'goals') = 'array') is true
  ),
  constraint workspace_size check (octet_length(state::text) <= 5242880)
);
alter table public.workspaces enable row level security;
revoke all on table public.workspaces from public, anon, authenticated;
grant select on table public.workspaces to authenticated;
grant insert (user_id, state) on table public.workspaces to authenticated;
grant update (state) on table public.workspaces to authenticated;
create policy workspace_owner_read on public.workspaces for select to authenticated
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'aal') = 'aal2');
create policy workspace_owner_create on public.workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id and (select auth.jwt() ->> 'aal') = 'aal2');
create policy workspace_owner_update on public.workspaces for update to authenticated
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.uid()) = user_id and (select auth.jwt() ->> 'aal') = 'aal2');
-- Clients update only state with their expected revision in the WHERE clause.
-- PostgreSQL locks/rechecks that predicate, so stale concurrent writes affect no row.
create function public.advance_workspace_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.user_id := old.user_id;
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.advance_workspace_revision() from public, anon, authenticated;
create trigger advance_workspace_revision before update on public.workspaces
  for each row execute function public.advance_workspace_revision();
commit;
