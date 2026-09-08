-- ============================================================
-- AulaWM — políticas RLS faltantes
--
-- Encontrado probando el login real (2026-09-08): roles_usuario, matriculas
-- y grupos tenían `enable row level security` en la migración inicial pero
-- NUNCA recibieron una política — con RLS activo y sin política, Postgres
-- deniega todo por defecto (el modo de falla seguro, pero silencioso: el
-- perfil del usuario logueado se leía como null en vez de fallar con un
-- error visible). Sin esto, ni el propio usuario puede leer su rol o su
-- grupo, lo cual rompe cualquier lectura directa desde Next.js bajo el
-- modelo híbrido de ADR-0008.
-- ============================================================

create policy roles_propios on roles_usuario
  for select using (usuario_id = auth.uid() or es_docente());

create policy matriculas_propias on matriculas
  for select using (estudiante_id = auth.uid() or es_docente());

-- Necesaria para que el embed de PostgREST `matriculas(...grupos(nombre))`
-- pueda resolver el nombre del grupo del propio estudiante.
create policy grupos_visibles on grupos
  for select using (
    es_docente() or exists (
      select 1 from matriculas m
      where m.grupo_id = grupos.id and m.estudiante_id = auth.uid()
    )
  );
