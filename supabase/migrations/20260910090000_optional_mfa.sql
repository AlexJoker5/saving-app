-- Run manually in Supabase SQL Editor before deploying the optional-2FA app.
-- Requires both earlier workspace migrations. Does not modify workspace rows.
-- Opt-in MFA model: https://supabase.com/docs/guides/auth/auth-mfa
begin;

-- Keep factor lookup private; clients do not receive access to auth.mfa_factors.
create schema if not exists saving_private;
revoke all on schema saving_private from public;
grant usage on schema saving_private to authenticated;

create or replace function saving_private.workspace_session_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (
      (auth.jwt() ->> 'aal') = 'aal2'
      or (
        (auth.jwt() ->> 'aal') = 'aal1'
        and not exists (
          select 1 from auth.mfa_factors
          where user_id = auth.uid() and status = 'verified'
        )
      )
    );
$$;
revoke all on function saving_private.workspace_session_allowed() from public, anon, authenticated;
grant execute on function saving_private.workspace_session_allowed() to authenticated;

-- Ownership remains mandatory for each operation.
alter policy workspace_owner_read on public.workspaces
  using ((select auth.uid()) = user_id);
alter policy workspace_owner_create on public.workspaces
  with check ((select auth.uid()) = user_id);
alter policy workspace_owner_update on public.workspaces
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Restrictive policies also constrain any other permissive policies.
-- Check live verified factors, not user-editable metadata or cached JWT factors.
drop policy if exists workspace_mfa_if_enrolled on public.workspaces;
create policy workspace_mfa_if_enrolled on public.workspaces
  as restrictive for all to authenticated
  using ((select saving_private.workspace_session_allowed()))
  with check ((select saving_private.workspace_session_allowed()));

commit;
