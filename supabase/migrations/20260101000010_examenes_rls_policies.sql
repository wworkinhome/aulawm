-- ============================================================
-- AulaWM — políticas RLS para listar exámenes disponibles
--
-- Solo para METADATOS del examen (nombre, minutos, fechas) — nunca para el
-- banco de preguntas ni la clave, que siguen sin política alguna a
-- propósito y se sirven exclusivamente vía Nest (ver
-- ExamenesService.serializarIntento en apps/api, que nunca incluye
-- `clave`). Necesario para que /examenes pueda listar exámenes disponibles
-- con una lectura directa a Supabase (ADR-0008).
-- ============================================================

create policy examenes_visibles on examenes
  for select using (
    autor_id = auth.uid()
    or (
      publicado = true
      and exists (
        select 1 from examen_asignaciones ea
        join matriculas m on m.grupo_id = ea.grupo_id
        where ea.examen_id = examenes.id
          and m.estudiante_id = auth.uid()
          and m.estado = 'activa'
      )
    )
  );

create policy examen_asignaciones_visibles on examen_asignaciones
  for select using (
    exists (
      select 1 from matriculas m
      where m.grupo_id = examen_asignaciones.grupo_id
        and m.estudiante_id = auth.uid()
        and m.estado = 'activa'
    )
    or es_docente()
  );
