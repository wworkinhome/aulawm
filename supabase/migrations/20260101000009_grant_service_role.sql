-- ============================================================
-- AulaWM — GRANT para `service_role`
--
-- La migración 20260101000005 otorgó privilegios a `authenticated`/`anon`
-- pero se olvidó de `service_role` — el rol que usa el admin client de
-- NestJS (SupabaseAdminService, ver ADR-0008). Sin este GRANT, incluso el
-- backend con la service-role key recibe "permission denied", encontrado
-- probando el primer endpoint real de dominio (GET /examenes/:id/intento).
-- `service_role` normalmente evita RLS por su atributo BYPASSRLS, pero eso
-- no sustituye el GRANT de tabla igual que con `authenticated`/`anon`.
-- ============================================================

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
