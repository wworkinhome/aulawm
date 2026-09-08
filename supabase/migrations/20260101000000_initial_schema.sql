-- ============================================================
-- AulaWM — esquema Postgres / Supabase
-- Migración inicial. Portado desde el design handoff:
--   LMS Wilmer Moqsuera/design_handoff_aulawm/sql/schema.sql
-- Ver docs/adr/0012-raw-sql-migrations.md: el esquema se versiona como SQL
-- crudo (no Prisma) porque depende de RLS, funciones y triggers nativos
-- de Postgres que un ORM no modela bien.
-- Convención: snake_case, ids uuid, timestamptz, RLS en todo.
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================================================
-- 1. IDENTIDAD Y ORGANIZACIÓN
-- ============================================================

create type rol_usuario as enum ('estudiante', 'docente', 'coordinacion');
create type estado_matricula as enum ('pendiente', 'activa', 'retirada');

create table perfiles (
  id            uuid primary key references auth.users on delete cascade,
  nombres       text not null,
  apellidos     text not null,
  correo        citext not null unique,
  documento     text,
  telefono      text,
  avatar_url    text,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table roles_usuario (
  usuario_id uuid not null references perfiles on delete cascade,
  rol        rol_usuario not null,
  primary key (usuario_id, rol)
);

-- Consentimiento del acudiente. Ley 1581/2012 + Decreto 1377/2013.
create table consentimientos (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references perfiles on delete cascade,
  acudiente      text not null,
  documento      text not null,
  parentesco     text,
  otorgado_en    timestamptz not null default now(),
  revocado_en    timestamptz,
  evidencia_url  text
);

create table anios_academicos (
  id      uuid primary key default gen_random_uuid(),
  anio    int not null unique,
  inicia  date not null,
  termina date not null
);

create table periodos (
  id                uuid primary key default gen_random_uuid(),
  anio_id           uuid not null references anios_academicos on delete cascade,
  numero            int  not null check (numero between 1 and 4),
  nombre            text not null,
  inicia            date not null,
  termina           date not null,
  cierre_de_notas   date not null,
  unique (anio_id, numero)
);

create table grupos (
  id         uuid primary key default gen_random_uuid(),
  anio_id    uuid not null references anios_academicos on delete cascade,
  nombre     text not null,                      -- '10°B'
  jornada    text not null default 'única',
  director_id uuid references perfiles,
  unique (anio_id, nombre)
);

create table matriculas (
  id          uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references perfiles on delete cascade,
  grupo_id    uuid not null references grupos on delete cascade,
  estado      estado_matricula not null default 'pendiente',
  aprobada_por uuid references perfiles,
  creada_en   timestamptz not null default now(),
  unique (estudiante_id, grupo_id)
);

-- ============================================================
-- 2. CONTENIDO
-- ============================================================

create type tipo_clase   as enum ('video', 'lectura', 'lab', 'quiz');
create type tipo_recurso as enum ('pdf', 'xlsx', 'docx', 'pptx', 'sql', 'repo', 'slides', 'video', 'enlace');

create table cursos (
  id          uuid primary key default gen_random_uuid(),
  anio_id     uuid not null references anios_academicos on delete cascade,
  nombre      text not null,                    -- 'Fullstack en JavaScript'
  codigo      text not null,                    -- 'FSJ'
  descripcion text,
  color       text,                             -- token de acento
  docente_id  uuid not null references perfiles,
  unique (anio_id, codigo)
);

create table curso_grupos (
  curso_id uuid not null references cursos on delete cascade,
  grupo_id uuid not null references grupos on delete cascade,
  primary key (curso_id, grupo_id)
);

create table modulos (
  id       uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos on delete cascade,
  orden    int  not null,
  titulo   text not null,
  unique (curso_id, orden)
);

create table clases (
  id          uuid primary key default gen_random_uuid(),
  modulo_id   uuid not null references modulos on delete cascade,
  orden       int  not null,
  tipo        tipo_clase not null,
  titulo      text not null,
  descripcion text,
  -- video
  video_asset_id text,                          -- id en Mux / Cloudflare Stream
  duracion_seg   int,
  -- lab o quiz asociado
  lab_id      uuid,
  examen_id   uuid,
  publicada   boolean not null default false,
  unique (modulo_id, orden)
);

create table clase_capitulos (
  id         uuid primary key default gen_random_uuid(),
  clase_id   uuid not null references clases on delete cascade,
  segundo    int  not null,
  titulo     text not null
);

create table recursos (
  id          uuid primary key default gen_random_uuid(),
  curso_id    uuid references cursos on delete cascade,
  clase_id    uuid references clases on delete cascade,
  tipo        tipo_recurso not null,
  titulo      text not null,
  descripcion text,
  storage_path text,                            -- bucket 'material'
  url_externa text,
  bytes       bigint,
  creado_en   timestamptz not null default now(),
  check (storage_path is not null or url_externa is not null)
);

create table apuntes (
  id           uuid primary key default gen_random_uuid(),
  clase_id     uuid not null references clases on delete cascade,
  estudiante_id uuid not null references perfiles on delete cascade,
  segundo      int,
  texto        text not null,
  creado_en    timestamptz not null default now()
);

create table progreso_clase (
  clase_id       uuid not null references clases on delete cascade,
  estudiante_id  uuid not null references perfiles on delete cascade,
  segundo_alcanzado int not null default 0,
  completada     boolean not null default false,
  visto_en       timestamptz not null default now(),
  primary key (clase_id, estudiante_id)
);

-- ============================================================
-- 3. EVALUACIÓN TIPO ICFES
-- ============================================================

create type dificultad     as enum ('baja', 'media', 'alta');
create type estado_intento as enum ('en_curso', 'finalizado', 'anulado', 'expirado');

create table competencias (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,                  -- 'Lectura crítica'
  sigla  text not null unique
);

create table preguntas (
  id             uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references competencias,
  autor_id       uuid not null references perfiles,
  contexto       text,                          -- lectura compartida
  contexto_titulo text,
  enunciado      text not null,
  opciones       jsonb not null,                -- ["...","...","...","..."]
  clave          int  not null check (clave between 0 and 3),
  retroalimentacion text,
  dificultad     dificultad not null default 'media',
  -- estadística acumulada, la actualiza un job
  veces_usada    int  not null default 0,
  tasa_acierto   numeric(5,2),
  archivada      boolean not null default false,
  creada_en      timestamptz not null default now(),
  check (jsonb_array_length(opciones) = 4)
);

create table examenes (
  id          uuid primary key default gen_random_uuid(),
  autor_id    uuid not null references perfiles,
  nombre      text not null,                    -- 'Simulacro 4 · Periodo 3'
  minutos     int  not null default 105,
  -- flags del constructor
  mezclar_preguntas          boolean not null default true,
  mezclar_opciones           boolean not null default true,
  mostrar_clave_al_terminar  boolean not null default false,
  cronometro_visible         boolean not null default true,
  permitir_retomar           boolean not null default false,
  publicado   boolean not null default false,
  creado_en   timestamptz not null default now()
);

create table examen_preguntas (
  examen_id   uuid not null references examenes on delete cascade,
  pregunta_id uuid not null references preguntas,
  orden       int  not null,
  primary key (examen_id, pregunta_id),
  unique (examen_id, orden)
);

create table examen_asignaciones (
  id        uuid primary key default gen_random_uuid(),
  examen_id uuid not null references examenes on delete cascade,
  grupo_id  uuid not null references grupos on delete cascade,
  abre      timestamptz not null,
  cierra    timestamptz not null,
  unique (examen_id, grupo_id)
);

create table intentos (
  id             uuid primary key default gen_random_uuid(),
  examen_id      uuid not null references examenes,
  estudiante_id  uuid not null references perfiles on delete cascade,
  -- orden materializado al crear el intento (si se mezcla)
  orden_preguntas uuid[] not null,
  inicio         timestamptz not null default now(),
  fin            timestamptz,
  estado         estado_intento not null default 'en_curso',
  puntaje_global int,
  percentil      int
);
create index on intentos (estudiante_id, examen_id);

create table respuestas (
  intento_id       uuid not null references intentos on delete cascade,
  pregunta_id      uuid not null references preguntas,
  opcion           int  check (opcion between 0 and 3),
  marcada          boolean not null default false,
  segundos_empleados int not null default 0,
  respondida_en    timestamptz not null default now(),
  primary key (intento_id, pregunta_id)
);

create table resultados_competencia (
  intento_id     uuid not null references intentos on delete cascade,
  competencia_id uuid not null references competencias,
  puntaje        int  not null,                 -- 0..100
  nivel          int  not null check (nivel between 1 and 4),
  primary key (intento_id, competencia_id)
);

-- ============================================================
-- 4. LABORATORIOS
-- ============================================================

create type lenguaje_lab as enum ('javascript', 'python', 'sql', 'html_css');
create type veredicto_envio as enum ('en_cola', 'ejecutando', 'aceptado', 'fallo_pruebas', 'error_compilacion', 'timeout', 'error_runner');

create table labs (
  id          uuid primary key default gen_random_uuid(),
  autor_id    uuid not null references perfiles,
  curso_id    uuid references cursos on delete set null,
  titulo      text not null,
  enunciado   text not null,
  lenguaje    lenguaje_lab not null,
  puntos      int  not null default 20,
  intentos_max int not null default 3,
  codigo_starter  text,
  codigo_solucion text,                         -- nunca sale al estudiante
  archivo_pruebas text,                         -- nunca sale al estudiante
  -- flags del constructor
  autocalificar        boolean not null default true,
  mostrar_consola      boolean not null default true,
  permitir_pegar       boolean not null default true,
  bloquear_al_salir    boolean not null default false,
  antiplagio           boolean not null default false,
  publicado   boolean not null default false,
  creado_en   timestamptz not null default now()
);

create table lab_casos (
  id        uuid primary key default gen_random_uuid(),
  lab_id    uuid not null references labs on delete cascade,
  orden     int  not null,
  nombre    text not null,
  asercion  text not null,
  puntos    int  not null default 1,
  visible   boolean not null default true,      -- visible para el estudiante
  unique (lab_id, orden)
);

create table lab_pistas (
  id      uuid primary key default gen_random_uuid(),
  lab_id  uuid not null references labs on delete cascade,
  orden   int  not null,
  texto   text not null,
  unique (lab_id, orden)
);

create table lab_envios (
  id            uuid primary key default gen_random_uuid(),
  lab_id        uuid not null references labs on delete cascade,
  estudiante_id uuid not null references perfiles on delete cascade,
  intento_num   int  not null,
  codigo        text not null,
  veredicto     veredicto_envio not null default 'en_cola',
  puntos_obtenidos int,
  salida        text,                           -- stdout/stderr truncado a 64 KB
  detalle_casos jsonb,                          -- [{casoId, paso, ms, salida}]
  enviado_en    timestamptz not null default now(),
  evaluado_en   timestamptz,
  unique (lab_id, estudiante_id, intento_num)
);
create index on lab_envios (estudiante_id, lab_id);

-- ============================================================
-- 5. ENTREGAS, RÚBRICAS Y NOTAS
-- ============================================================

create type tipo_asignacion  as enum ('taller', 'actividad', 'laboratorio', 'video', 'lectura', 'examen');
create type estado_entrega   as enum ('pendiente', 'entregada', 'tarde', 'calificada', 'devuelta');
create type calificador      as enum ('auto', 'docente');
create type categoria_nota   as enum ('talleres', 'labs', 'simulacros', 'actitudinal');

create table asignaciones (
  id            uuid primary key default gen_random_uuid(),
  curso_id      uuid not null references cursos on delete cascade,
  periodo_id    uuid not null references periodos,
  autor_id      uuid not null references perfiles,
  tipo          tipo_asignacion not null,
  categoria     categoria_nota  not null,
  titulo        text not null,
  instrucciones text,
  puntos        int  not null default 100,
  abre          timestamptz not null,
  cierra        timestamptz not null,
  -- políticas del formulario de publicación
  aceptar_tarde        boolean not null default true,
  penalizacion_tarde   numeric(5,2) not null default 20.0,   -- % descontado
  notificar_por_correo boolean not null default false,
  entrega_en_grupo     boolean not null default false,
  publicar_rubrica     boolean not null default true,
  lab_id        uuid references labs,
  examen_id     uuid references examenes,
  publicada     boolean not null default false,
  creada_en     timestamptz not null default now()
);

create table asignacion_grupos (
  asignacion_id uuid not null references asignaciones on delete cascade,
  grupo_id      uuid not null references grupos on delete cascade,
  primary key (asignacion_id, grupo_id)
);

create table asignacion_adjuntos (
  id            uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references asignaciones on delete cascade,
  nombre        text not null,
  storage_path  text not null,                  -- bucket 'material'
  mime          text,
  bytes         bigint
);

create table rubricas (
  id            uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references asignaciones on delete cascade unique
);

create table rubrica_criterios (
  id         uuid primary key default gen_random_uuid(),
  rubrica_id uuid not null references rubricas on delete cascade,
  orden      int  not null,
  nombre     text not null,
  puntos     int  not null,
  unique (rubrica_id, orden)
);

create table entregas (
  id            uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references asignaciones on delete cascade,
  estudiante_id uuid not null references perfiles on delete cascade,
  estado        estado_entrega not null default 'pendiente',
  comentario    text,
  entregada_en  timestamptz,
  unique (asignacion_id, estudiante_id)
);

create table entrega_archivos (
  id           uuid primary key default gen_random_uuid(),
  entrega_id   uuid not null references entregas on delete cascade,
  nombre       text not null,
  storage_path text not null,                   -- bucket 'entregas'
  mime         text,
  bytes        bigint,
  -- resultado de la verificación automática de .xlsx / .docx / .pptx
  verificacion jsonb,
  subido_en    timestamptz not null default now()
);

create table calificaciones (
  id            uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references asignaciones on delete cascade,
  estudiante_id uuid not null references perfiles on delete cascade,
  valor         numeric(4,2) not null,          -- escala 0.0 – 5.0
  puntos        int,                            -- puntaje bruto si aplica
  retroalimentacion text,
  por           calificador not null default 'docente',
  calificador_id uuid references perfiles,
  detalle_rubrica jsonb,                        -- {criterioId: puntos}
  publicada     boolean not null default false,
  creada_en     timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  unique (asignacion_id, estudiante_id)
);
create index on calificaciones (estudiante_id);

create table ponderaciones (
  curso_id   uuid not null references cursos on delete cascade,
  periodo_id uuid not null references periodos on delete cascade,
  categoria  categoria_nota not null,
  peso       numeric(5,2) not null,
  primary key (curso_id, periodo_id, categoria)
);

-- Materializada: la planilla del docente la lee en una sola consulta.
create table notas_definitivas (
  curso_id      uuid not null references cursos on delete cascade,
  periodo_id    uuid not null references periodos on delete cascade,
  estudiante_id uuid not null references perfiles on delete cascade,
  valor         numeric(4,2) not null,
  desglose      jsonb not null,                 -- {categoria: promedio}
  calculada_en  timestamptz not null default now(),
  primary key (curso_id, periodo_id, estudiante_id)
);

-- ============================================================
-- 6. GAMIFICACIÓN
-- ============================================================

create table insignias (
  id       uuid primary key default gen_random_uuid(),
  codigo   text not null unique,                -- 'racha_14'
  nombre   text not null,
  glifo    text,
  criterio jsonb not null                       -- lo evalúa un job
);

create table insignias_usuario (
  usuario_id  uuid not null references perfiles on delete cascade,
  insignia_id uuid not null references insignias on delete cascade,
  obtenida_en timestamptz not null default now(),
  primary key (usuario_id, insignia_id)
);

create table xp_eventos (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles on delete cascade,
  puntos     int  not null,
  motivo     text not null,
  ref_id     uuid,
  creado_en  timestamptz not null default now()
);

create table rachas (
  usuario_id     uuid primary key references perfiles on delete cascade,
  dias_actuales  int  not null default 0,
  dias_max       int  not null default 0,
  ultimo_dia     date
);

-- ============================================================
-- 7. FUNCIONES Y TRIGGERS
-- ============================================================

-- Rol del usuario autenticado, leído del JWT (custom access token hook).
create or replace function auth_roles() returns rol_usuario[] language sql stable as $$
  select coalesce(
    (select array_agg(r::rol_usuario)
     from jsonb_array_elements_text(
       coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as r),
    '{}'::rol_usuario[]);
$$;

create or replace function es_docente() returns boolean language sql stable as $$
  select 'docente' = any(auth_roles()) or 'coordinacion' = any(auth_roles());
$$;

-- ¿El usuario dicta el curso al que pertenece este grupo?
create or replace function dicta_grupo(g uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from curso_grupos cg
    join cursos c on c.id = cg.curso_id
    where cg.grupo_id = g and c.docente_id = auth.uid());
$$;

-- Recalcula la nota definitiva del estudiante en el curso/periodo.
create or replace function recalcular_definitiva(p_curso uuid, p_periodo uuid, p_est uuid)
returns void language plpgsql as $$
declare
  v_valor numeric(4,2);
  v_desglose jsonb;
begin
  with prom as (
    select a.categoria, avg(c.valor) as promedio
    from calificaciones c
    join asignaciones a on a.id = c.asignacion_id
    where a.curso_id = p_curso and a.periodo_id = p_periodo and c.estudiante_id = p_est
    group by a.categoria
  ), pond as (
    select p.categoria, p.promedio, coalesce(w.peso, 0) as peso
    from prom p
    left join ponderaciones w
      on w.curso_id = p_curso and w.periodo_id = p_periodo and w.categoria = p.categoria
  )
  select round(sum(promedio * peso) / nullif(sum(peso), 0), 2),
         jsonb_object_agg(categoria, round(promedio, 2))
    into v_valor, v_desglose
  from pond;

  if v_valor is null then return; end if;

  insert into notas_definitivas (curso_id, periodo_id, estudiante_id, valor, desglose)
  values (p_curso, p_periodo, p_est, v_valor, v_desglose)
  on conflict (curso_id, periodo_id, estudiante_id)
  do update set valor = excluded.valor,
                desglose = excluded.desglose,
                calculada_en = now();
end $$;

create or replace function trg_calificacion_definitiva() returns trigger language plpgsql as $$
declare a asignaciones;
begin
  select * into a from asignaciones where id = new.asignacion_id;
  perform recalcular_definitiva(a.curso_id, a.periodo_id, new.estudiante_id);
  return new;
end $$;

create trigger calificaciones_definitiva
  after insert or update of valor on calificaciones
  for each row execute function trg_calificacion_definitiva();

-- ============================================================
-- 8. RLS
-- ============================================================
-- Patrón: el estudiante ve y escribe lo suyo; el docente ve y escribe lo de
-- los grupos que dicta; coordinación ve todo. Las escrituras de dominio
-- (notas, calificación de labs, cierre de intentos) las hace Nest con la
-- service_role key, que salta RLS — no dependas de RLS para esas reglas.

alter table perfiles              enable row level security;
alter table roles_usuario         enable row level security;
alter table consentimientos       enable row level security;
alter table matriculas            enable row level security;
alter table cursos                enable row level security;
alter table modulos               enable row level security;
alter table clases                enable row level security;
alter table recursos              enable row level security;
alter table apuntes               enable row level security;
alter table progreso_clase        enable row level security;
alter table preguntas             enable row level security;
alter table examenes              enable row level security;
alter table intentos              enable row level security;
alter table respuestas            enable row level security;
alter table resultados_competencia enable row level security;
alter table labs                  enable row level security;
alter table lab_casos             enable row level security;
alter table lab_envios            enable row level security;
alter table asignaciones          enable row level security;
alter table entregas              enable row level security;
alter table entrega_archivos      enable row level security;
alter table calificaciones        enable row level security;
alter table notas_definitivas     enable row level security;
alter table insignias_usuario     enable row level security;
alter table xp_eventos            enable row level security;
alter table rachas                enable row level security;

create policy perfil_propio on perfiles
  for select using (id = auth.uid() or es_docente());
create policy perfil_actualizar on perfiles
  for update using (id = auth.uid());

create policy apuntes_propios on apuntes
  for all using (estudiante_id = auth.uid()) with check (estudiante_id = auth.uid());

create policy progreso_propio on progreso_clase
  for all using (estudiante_id = auth.uid()) with check (estudiante_id = auth.uid());

create policy intentos_propios on intentos
  for select using (estudiante_id = auth.uid() or es_docente());

create policy respuestas_propias on respuestas
  for select using (exists (
    select 1 from intentos i where i.id = intento_id
      and (i.estudiante_id = auth.uid() or es_docente())));

create policy envios_propios on lab_envios
  for select using (estudiante_id = auth.uid() or es_docente());

create policy entregas_propias on entregas
  for select using (estudiante_id = auth.uid() or es_docente());

-- El estudiante ve su nota SOLO si está publicada.
create policy calificacion_visible on calificaciones
  for select using (
    (estudiante_id = auth.uid() and publicada) or es_docente());

create policy definitiva_visible on notas_definitivas
  for select using (estudiante_id = auth.uid() or es_docente());

-- El banco de preguntas nunca es legible por el estudiante:
-- el cuadernillo se sirve desde Nest, sin la columna `clave`.
create policy preguntas_docente on preguntas
  for all using (es_docente()) with check (es_docente());

create policy labs_lectura on labs
  for select using (publicado or es_docente());
-- Ojo: codigo_solucion y archivo_pruebas no deben exponerse. Servir los labs
-- al estudiante a través de una vista sin esas columnas, o solo vía Nest.

create policy casos_visibles on lab_casos
  for select using (visible or es_docente());

create policy asignaciones_lectura on asignaciones
  for select using (
    es_docente() or exists (
      select 1 from asignacion_grupos ag
      join matriculas m on m.grupo_id = ag.grupo_id
      where ag.asignacion_id = id and m.estudiante_id = auth.uid() and m.estado = 'activa')
    and publicada);

-- ============================================================
-- 9. STORAGE (buckets)
-- ============================================================
-- material  : público-con-firma, sube el docente
-- entregas  : privado, sube el estudiante hasta la fecha de cierre
-- avatares  : privado con firma
--
-- insert into storage.buckets (id, name, public) values
--   ('material', 'material', false),
--   ('entregas', 'entregas', false),
--   ('avatares', 'avatares', false);
--
-- Convención de rutas:
--   material/{cursoId}/{asignacionId}/{nombre}
--   entregas/{asignacionId}/{estudianteId}/{intento}/{nombre}

-- ============================================================
-- 10. SEMILLAS MÍNIMAS
-- ============================================================

insert into competencias (nombre, sigla) values
  ('Lectura crítica', 'LC'),
  ('Razonamiento cuantitativo', 'RC'),
  ('Sociales y ciudadanas', 'SC'),
  ('Ciencias naturales', 'CN'),
  ('Inglés', 'IN'),
  ('Tecnología', 'TE'),
  ('Emprendimiento', 'EM')
on conflict do nothing;
