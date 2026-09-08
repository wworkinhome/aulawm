-- ============================================================
-- AulaWM — simulacro ICFES de prueba (desarrollo/demo, NO producción)
--
-- Un examen corto (6 preguntas, 3 competencias) publicado al grupo 10°B,
-- para poder probar el flujo completo: crear intento, responder, finalizar,
-- ver reporte por competencia. Complementa supabase/seed.sql.
--
-- Los ids usan el formato UUID v4 real (nibble de versión "4", variante
-- "8") a propósito — un primer intento con ids "legibles" tipo
-- 00000000-...-00a1 fue rechazado por el DTO de la API
-- (`@IsUUID()` valida la versión real, y Postgres los aceptaba igual
-- porque el tipo `uuid` no exige esa validación, así que el problema no
-- apareció hasta probar el endpoint real).
-- ============================================================

insert into preguntas (id, competencia_id, autor_id, enunciado, opciones, clave, retroalimentacion, dificultad)
select
  v.id, c.id, '4fa24323-9504-4aba-8a87-0295a6c86c4a',
  v.enunciado, v.opciones::jsonb, v.clave, v.retro, v.dificultad::dificultad
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'LC', '¿Cuál palabra es un sinónimo de "veloz"?', '["Lento","Rápido","Alto","Bajo"]', 1, 'Rápido significa lo mismo que veloz.', 'baja'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'LC', 'En el texto "El perro corrió hacia el parque", ¿quién realiza la acción?', '["El parque","El perro","Nadie","La calle"]', 1, 'El sujeto de la oración es "el perro".', 'baja'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'RC', '¿Cuánto es 12 + 8?', '["18","20","22","24"]', 1, '12 + 8 = 20.', 'baja'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'RC', 'Si x + 5 = 10, ¿cuánto vale x?', '["3","4","5","6"]', 2, 'x = 10 - 5 = 5.', 'media'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'TE', '¿Qué etiqueta HTML se usa para un párrafo?', '["<div>","<p>","<span>","<h1>"]', 1, '<p> define un párrafo.', 'baja'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'TE', 'En JavaScript, ¿qué palabra clave declara una variable que no cambia?', '["let","var","const","function"]', 2, 'const declara una constante.', 'media')
) as v(id, sigla, enunciado, opciones, clave, retro, dificultad)
join competencias c on c.sigla = v.sigla
on conflict (id) do nothing;

insert into examenes (id, autor_id, nombre, minutos, mezclar_preguntas, mezclar_opciones, mostrar_clave_al_terminar, cronometro_visible, permitir_retomar, publicado)
values (
  '20000000-0000-4000-8000-000000000001', '4fa24323-9504-4aba-8a87-0295a6c86c4a',
  'Simulacro corto · Periodo 3', 15, false, false, true, true, false, true
)
on conflict (id) do nothing;

insert into examen_preguntas (examen_id, pregunta_id, orden)
select '20000000-0000-4000-8000-000000000001', v.id, v.orden
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 1),
  ('10000000-0000-4000-8000-000000000002'::uuid, 2),
  ('10000000-0000-4000-8000-000000000003'::uuid, 3),
  ('10000000-0000-4000-8000-000000000004'::uuid, 4),
  ('10000000-0000-4000-8000-000000000005'::uuid, 5),
  ('10000000-0000-4000-8000-000000000006'::uuid, 6)
) as v(id, orden)
on conflict do nothing;

insert into examen_asignaciones (examen_id, grupo_id, abre, cierra)
values (
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  now() - interval '1 day',
  now() + interval '60 days'
)
on conflict (examen_id, grupo_id) do nothing;
