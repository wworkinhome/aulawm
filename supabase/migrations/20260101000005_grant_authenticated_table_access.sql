-- ============================================================
-- AulaWM — GRANT base para el rol `authenticated`
--
-- Encontrado probando el login real (2026-09-08): ninguna tabla tenía un
-- GRANT explícito hacia `authenticated`. RLS únicamente RESTRINGE un
-- acceso que la tabla ya permite a nivel de rol — sin el GRANT de base,
-- Postgres deniega con "permission denied for table X" ANTES de evaluar
-- ninguna política, sin importar qué tan permisiva sea esa política.
-- (`roles_usuario`/`matriculas`/`grupos` ya tenían política desde la
-- migración anterior, pero seguían inaccesibles por esta razón.)
--
-- Se otorga a nivel de esquema, dejando que RLS —ya activado en todas las
-- tablas de estudiante— sea la única capa real de control de acceso, tal
-- como lo hace Supabase por defecto al crear tablas desde su Table Editor.
-- ============================================================

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
