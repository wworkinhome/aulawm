-- ============================================================
-- AulaWM — fix custom_access_token_hook
--
-- Two bugs found testing against the real `aulawm` project (2026-09-08):
--
-- 1. The function ran as the invoking role (`supabase_auth_admin`), which is
--    not a superuser and does not bypass RLS. Every table it reads
--    (roles_usuario, curso_grupos, cursos, matriculas) has RLS enabled with
--    no policy permitting that role, so the query failed outright (surfaced
--    to the client as a 500 "Error running hook" on login) rather than just
--    returning empty results. Fix: `security definer` so it runs as the
--    function owner instead, with `search_path` pinned for safety.
-- 2. `jsonb_set(claims, '{app_metadata,roles}', ..., true)` silently no-ops
--    if `app_metadata` doesn't already exist in `claims` — `create_missing`
--    only creates the *last* key in the path, not intermediate ones. Fix:
--    ensure `app_metadata` exists as an object before setting nested keys.
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_roles rol_usuario[];
  user_groups uuid[];
  uid uuid := (event->>'user_id')::uuid;
begin
  select coalesce(array_agg(rol), '{}') into user_roles
  from roles_usuario where usuario_id = uid;

  select coalesce(array_agg(distinct grupo_id), '{}') into user_groups
  from (
    select cg.grupo_id
    from curso_grupos cg
    join cursos c on c.id = cg.curso_id
    where c.docente_id = uid
    union
    select m.grupo_id
    from matriculas m
    where m.estudiante_id = uid and m.estado = 'activa'
  ) g;

  claims := coalesce(event->'claims', '{}'::jsonb);
  if not (claims ? 'app_metadata') then
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb, true);
  end if;
  claims := jsonb_set(claims, '{app_metadata,roles}', to_jsonb(user_roles), true);
  claims := jsonb_set(claims, '{app_metadata,grupos}', to_jsonb(user_groups), true);

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
