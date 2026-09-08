-- ============================================================
-- AulaWM — custom access token hook
-- Embeds roles and taught/enrolled group ids into the Supabase-issued JWT,
-- under app_metadata, so both Postgres RLS (via auth_roles()/es_docente()
-- in the initial migration) and NestJS's JwtSupabaseGuard read the same
-- claims from the same token. See docs/adr/0009-supabase-auth.md.
--
-- After applying this migration, register the function in the dashboard:
-- Authentication -> Hooks (Beta) -> Customize Access Token (JWT) Claims hook
-- -> select public.custom_access_token_hook. This SQL alone does not wire
-- it up — Supabase Auth must be told to call it.
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_roles rol_usuario[];
  user_groups uuid[];
  uid uuid := (event->>'user_id')::uuid;
begin
  select coalesce(array_agg(rol), '{}') into user_roles
  from roles_usuario where usuario_id = uid;

  -- grupos: para docente, los grupos de los cursos que dicta;
  -- para estudiante, los grupos donde tiene matrícula activa.
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
  claims := jsonb_set(claims, '{app_metadata,roles}', to_jsonb(user_roles), true);
  claims := jsonb_set(claims, '{app_metadata,grupos}', to_jsonb(user_groups), true);

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Only the Auth service may invoke this hook.
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
