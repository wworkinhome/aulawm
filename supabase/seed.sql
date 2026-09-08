-- ============================================================
-- AulaWM — datos de prueba (desarrollo/demo, NO producción)
--
-- Crea una estructura académica mínima para poder navegar el producto:
-- un docente, un grupo, dos estudiantes matriculados, un curso con dos
-- módulos y unas pocas clases.
--
-- Requisito previo: los tres usuarios de auth.users ya deben existir
-- (creados vía Supabase Admin API — email/password no se puede hacer por
-- SQL). Los ids de abajo corresponden a los usuarios reales creados el
-- 2026-09-08 en el proyecto `aulawm`:
--   wilmer.mosquera@colegio.edu.co  (docente)
--   sara.mena@colegio.edu.co        (estudiante)
--   juan.cuesta@colegio.edu.co      (estudiante)
-- Contraseña de los tres: AulaWM2026!  (solo para pruebas — rotar/borrar
-- antes de cualquier uso real).
--
-- Este archivo es idempotente (on conflict do nothing / upsert por id fijo)
-- para poder re-ejecutarlo sin duplicar filas.
-- ============================================================

-- --- perfiles ---
insert into perfiles (id, nombres, apellidos, correo) values
  ('4fa24323-9504-4aba-8a87-0295a6c86c4a', 'Wilmer', 'Mosquera', 'wilmer.mosquera@colegio.edu.co'),
  ('5dcfa39b-7f00-423c-929d-ffccfa23e4fb', 'Sara', 'Mena Palacios', 'sara.mena@colegio.edu.co'),
  ('54ad9e4b-b9b5-4851-8d97-df6cbdd790e7', 'Juan', 'D. Cuesta', 'juan.cuesta@colegio.edu.co')
on conflict (id) do nothing;

-- --- roles ---
insert into roles_usuario (usuario_id, rol) values
  ('4fa24323-9504-4aba-8a87-0295a6c86c4a', 'docente'),
  ('5dcfa39b-7f00-423c-929d-ffccfa23e4fb', 'estudiante'),
  ('54ad9e4b-b9b5-4851-8d97-df6cbdd790e7', 'estudiante')
on conflict do nothing;

-- --- año académico y periodo vigente ---
insert into anios_academicos (id, anio, inicia, termina) values
  ('00000000-0000-0000-0000-000000000001', 2026, '2026-01-20', '2026-11-27')
on conflict (anio) do nothing;

insert into periodos (id, anio_id, numero, nombre, inicia, termina, cierre_de_notas) values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   3, 'Periodo 3', '2026-08-01', '2026-11-27', '2026-11-28')
on conflict (anio_id, numero) do nothing;

-- --- grupo ---
insert into grupos (id, anio_id, nombre, jornada, director_id) values
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   '10°B', 'única', '4fa24323-9504-4aba-8a87-0295a6c86c4a')
on conflict (anio_id, nombre) do nothing;

-- --- matrículas activas ---
insert into matriculas (estudiante_id, grupo_id, estado, aprobada_por) values
  ('5dcfa39b-7f00-423c-929d-ffccfa23e4fb', '00000000-0000-0000-0000-000000000003',
   'activa', '4fa24323-9504-4aba-8a87-0295a6c86c4a'),
  ('54ad9e4b-b9b5-4851-8d97-df6cbdd790e7', '00000000-0000-0000-0000-000000000003',
   'activa', '4fa24323-9504-4aba-8a87-0295a6c86c4a')
on conflict (estudiante_id, grupo_id) do nothing;

-- --- curso ---
insert into cursos (id, anio_id, nombre, codigo, descripcion, color, docente_id) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Fullstack en JavaScript', 'FSJ',
   'Media técnica Auxiliar en Sistemas de Información — HTML, CSS, JavaScript, React y bases de datos.',
   '#7C5CFF', '4fa24323-9504-4aba-8a87-0295a6c86c4a')
on conflict (anio_id, codigo) do nothing;

insert into curso_grupos (curso_id, grupo_id) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003')
on conflict do nothing;

-- --- módulos y clases ---
insert into modulos (id, curso_id, orden, titulo) values
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 1, 'Fundamentos de JavaScript'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004', 2, 'React y componentes')
on conflict (curso_id, orden) do nothing;

insert into clases (id, modulo_id, orden, tipo, titulo, descripcion, duracion_seg, publicada) values
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 1, 'video',
   'Variables y tipos de datos', 'Introducción a variables, tipos primitivos y const/let.', 620, true),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', 2, 'lectura',
   'Condicionales y ciclos', 'Guía de lectura sobre if/else, for y while.', null, true),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000006', 1, 'video',
   'Tu primer componente', 'Cómo crear y renderizar un componente funcional.', 540, true)
on conflict (modulo_id, orden) do nothing;

-- --- ponderaciones del curso (para que recalcular_definitiva() produzca
--     una nota definitiva real en cuanto exista al menos una calificación) ---
insert into ponderaciones (curso_id, periodo_id, categoria, peso) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'talleres', 40),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'labs', 30),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'simulacros', 20),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'actitudinal', 10)
on conflict (curso_id, periodo_id, categoria) do nothing;
