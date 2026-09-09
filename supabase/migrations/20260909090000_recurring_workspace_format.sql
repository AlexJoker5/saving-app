begin;

-- Accept existing accounts and plan-owned recurring expense rules.
alter table public.workspaces drop constraint workspace_shape;
alter table public.workspaces add constraint workspace_shape check (
  (jsonb_typeof(state) = 'object'
    and state ->> 'version' in ('1', '2')
    and jsonb_typeof(state -> 'demo') = 'boolean'
    and jsonb_typeof(state -> 'mainId') = 'string'
    and jsonb_typeof(state -> 'budget') = 'number'
    and jsonb_typeof(state -> 'plans') = 'array'
    and jsonb_typeof(state -> 'expenses') = 'array'
    and jsonb_typeof(state -> 'goals') = 'array') is true
);

-- Prevent an older app tab from stripping rules after an account upgrades.
create or replace function public.advance_workspace_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.state ->> 'version' = '2' and new.state ->> 'version' is distinct from '2' then
    raise exception 'This workspace requires the updated Saving app. Reload before saving.'
      using errcode = '23514';
  end if;
  new.user_id := old.user_id;
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.advance_workspace_revision() from public, anon, authenticated;

commit;
