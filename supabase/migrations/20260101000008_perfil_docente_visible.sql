-- ============================================================
-- AulaWM — un estudiante puede ver el perfil de su propio docente
--
-- Encontrado construyendo el detalle de curso (2026-09-08): la política
-- `perfil_propio` de la migración inicial solo permite ver la propia fila
-- o, si eres docente, cualquier fila — pero NO permite que un estudiante
-- vea la fila de SU docente. El embed de PostgREST
-- `cursos.perfiles!docente_id(...)` no falla, simplemente devuelve null
-- silenciosamente cuando RLS bloquea la fila embebida, así que el nombre
-- del docente desaparecía sin ningún error visible.
--
-- Política adicional (permisiva, se combina con OR junto a
-- `perfil_propio`): un estudiante ve el perfil de un docente si ese
-- docente dicta un curso en el que el estudiante tiene matrícula activa.
-- ============================================================

create policy perfil_docente_visible on perfiles
  for select using (
    exists (
      select 1 from cursos c
      join curso_grupos cg on cg.curso_id = c.id
      join matriculas m on m.grupo_id = cg.grupo_id
      where c.docente_id = perfiles.id
        and m.estudiante_id = auth.uid()
        and m.estado = 'activa'
    )
  );
