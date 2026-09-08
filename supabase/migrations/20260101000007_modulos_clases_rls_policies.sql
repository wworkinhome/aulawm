-- ============================================================
-- AulaWM — políticas RLS para `modulos` y `clases`
--
-- Necesarias para la primera pantalla de contenido real (lista de cursos +
-- detalle de curso, 2026-09-08). Mismo patrón que `cursos_visibles`: el
-- docente ve todo lo suyo; el estudiante ve solo lo de cursos donde tiene
-- matrícula activa, y solo clases publicadas (una clase en borrador nunca
-- debe llegar a un estudiante, publicada o no es una decisión del docente,
-- no un detalle de transporte).
-- ============================================================

create policy modulos_visibles on modulos
  for select using (
    exists (
      select 1 from cursos c
      where c.id = modulos.curso_id
        and (
          c.docente_id = auth.uid()
          or exists (
            select 1 from curso_grupos cg
            join matriculas m on m.grupo_id = cg.grupo_id
            where cg.curso_id = c.id
              and m.estudiante_id = auth.uid()
              and m.estado = 'activa'
          )
        )
    )
  );

create policy clases_visibles on clases
  for select using (
    exists (
      select 1 from modulos mo
      join cursos c on c.id = mo.curso_id
      where mo.id = clases.modulo_id
        and (
          c.docente_id = auth.uid()
          or (
            clases.publicada = true
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
