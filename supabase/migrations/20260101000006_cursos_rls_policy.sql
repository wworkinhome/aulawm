-- ============================================================
-- AulaWM — política RLS para `cursos`
--
-- Encontrado construyendo /panel (2026-09-08): el conteo de "cursos a tu
-- cargo" del docente leía 0 porque `cursos` tenía RLS activo sin ninguna
-- política (ver TD-015 en TECHNICAL_DEBT.md). Un docente ve sus propios
-- cursos; un estudiante ve los cursos de los grupos donde tiene matrícula
-- activa.
-- ============================================================

create policy cursos_visibles on cursos
  for select using (
    docente_id = auth.uid()
    or exists (
      select 1 from curso_grupos cg
      join matriculas m on m.grupo_id = cg.grupo_id
      where cg.curso_id = cursos.id
        and m.estudiante_id = auth.uid()
        and m.estado = 'activa'
    )
  );
