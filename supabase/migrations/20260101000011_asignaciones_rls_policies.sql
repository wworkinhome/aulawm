-- ============================================================
-- AulaWM — políticas RLS para listar asignaciones (tareas/talleres)
--
-- Metadatos únicamente: crear/publicar/calificar siguen siendo escrituras
-- de Nest (ADR-0008 — "publicar cualquier cosa" y "notas" están en la lista
-- explícita de escrituras que nunca van directo a Supabase). Esta política
-- solo habilita la LECTURA de la lista para que /actividades pueda mostrarla
-- con una consulta directa, igual que /examenes.
-- ============================================================

create policy asignaciones_visibles on asignaciones
  for select using (
    autor_id = auth.uid()
    or es_docente()
    or (
      publicada = true
      and exists (
        select 1
        from curso_grupos cg
        join matriculas m on m.grupo_id = cg.grupo_id
        where cg.curso_id = asignaciones.curso_id
          and m.estudiante_id = auth.uid()
          and m.estado = 'activa'
      )
    )
  );
