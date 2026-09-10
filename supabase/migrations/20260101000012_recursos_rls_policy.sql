-- ============================================================
-- AulaWM — política RLS para `recursos` (material de apoyo por clase)
--
-- Solo METADATOS (título, tipo, tamaño) — nunca expone `storage_path`
-- utilizable directamente, porque las políticas RLS de Supabase Storage no
-- están configuradas para este bucket (ADR-0006: todo archivo se descarga
-- vía un signed URL emitido por Nest tras verificar dueño/matrícula, nunca
-- por conocer la ruta). Mismo patrón que `clases_visibles`: el docente ve
-- todo lo de sus cursos; el estudiante solo ve recursos de clases
-- publicadas en cursos donde tiene matrícula activa.
-- ============================================================

create policy recursos_visibles on recursos
  for select using (
    exists (
      select 1 from clases cl
      join modulos mo on mo.id = cl.modulo_id
      join cursos c on c.id = mo.curso_id
      where cl.id = recursos.clase_id
        and (
          c.docente_id = auth.uid()
          or (
            cl.publicada = true
            and exists (
              select 1 from curso_grupos cg
              join matriculas m on m.grupo_id = cg.grupo_id
              where cg.curso_id = c.id
                and m.estudiante_id = auth.uid()
                and m.estado = 'activa'
            )
          )
        )
    )
  );
