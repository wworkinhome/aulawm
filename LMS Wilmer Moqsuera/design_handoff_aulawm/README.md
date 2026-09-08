# Handoff: AulaWM — LMS del docente Wilmer Mosquera

## Resumen

LMS para la Institución Educativa donde el docente Wilmer Mosquera dicta Tecnología e
Informática, Excel, Word, PowerPoint, bases de datos, derecho laboral y emprendimiento,
y coordina la media técnica *Auxiliar en Sistemas de Información* (Fullstack en JavaScript).

El producto cubre cuatro capacidades:

1. **Cursos** con video, material de apoyo y apuntes con marca de tiempo.
2. **Simulacros tipo ICFES** cronometrados, con modo entrenamiento y reporte por competencias.
3. **Laboratorios**: programación autocalificada con pruebas (estilo Replit), y ofimática
   (Excel, Word, PowerPoint, SQL) con guía paso a paso y entrega de archivo.
4. **Autoría y gestión del docente**: construir exámenes y labs, publicar talleres, poner notas.

## Sobre los archivos de diseño

Los archivos de este paquete son **referencias de diseño hechas en HTML**. Son prototipos que
muestran la apariencia y el comportamiento previstos, **no código de producción para copiar**.
La tarea es **recrear estos diseños en el stack objetivo** (Next.js + Nest.js + Supabase),
usando sus patrones y librerías, no portar el HTML tal cual.

Concretamente: el mockup es un solo archivo con estilos en línea y datos escritos a mano.
En producción cada pantalla es una ruta de Next.js con datos del backend.

## Fidelidad

**Alta fidelidad.** Colores, tipografía, espaciado, radios y estados de interacción son
definitivos. Recréalos con precisión. Los tokens exactos están en la sección *Design tokens*.

Lo único que es placeholder: miniaturas de video, avatares y cualquier imagen. No se generaron
imágenes; hay que reemplazarlas por material real del docente.

---

# Arquitectura

## Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Web | **Next.js 15** (App Router, React 19, TypeScript) | SSR para el dashboard, Server Components para listados, streaming en las tablas grandes |
| API | **Nest.js 11** (REST, TypeScript) | Módulos por dominio, guards de rol, validación con `class-validator` |
| Datos | **Supabase Postgres** | Postgres administrado + Auth + Storage + Realtime en un solo proveedor |
| Auth | **Supabase Auth** (email/password + SSO institucional opcional) | JWT verificable desde Nest sin sesión propia |
| Archivos | **Supabase Storage** | Entregas .xlsx/.docx/.pptx, material del docente, videos cortos |
| Video | **Mux** o **Cloudflare Stream** | Supabase Storage no hace transcodificación ni HLS |
| Runner de código | **Judge0 self-hosted** o contenedores efímeros en **Fly.io / Cloud Run** | Ejecutar código de estudiantes NUNCA en el proceso de la API |
| Cola | **pg-boss** (sobre el mismo Postgres) | Calificación automática, notificaciones, transcodificación |
| Realtime | **Supabase Realtime** | Cronómetro del simulacro, entregas que entran en vivo, presencia en el examen |

### Por qué Nest si Supabase ya expone una API

Supabase PostgREST + RLS alcanza para leer y escribir filas. No alcanza para:

- calificar código ejecutando pruebas en sandbox,
- calcular la nota definitiva con ponderaciones por categoría y redondeo institucional,
- validar la integridad de un intento de examen (tiempo, orden, intentos restantes),
- firmar URLs de subida con reglas por rol y por fecha de cierre,
- integrarse con Mux y con el runner.

Regla práctica: **lecturas simples desde Next.js directo a Supabase con RLS; toda escritura de
dominio a través de Nest.** Así el navegador nunca puede escribir una nota.

## Diagrama de despliegue

```
┌──────────────────────────┐
│  Next.js 15 (Vercel)     │  App Router · RSC · Server Actions solo para forms simples
│  - /app/(alumno)/...     │
│  - /app/(docente)/...    │
│  - /app/(auth)/...       │
└───────┬──────────┬───────┘
        │          │
        │ fetch    │ supabase-js (solo SELECT con RLS)
        │ (JWT)    │
        ▼          ▼
┌──────────────────┐   ┌─────────────────────────────┐
│  Nest.js API     │──▶│  Supabase                   │
│  (Fly.io/Render) │   │  Postgres · Auth · Storage   │
│  - guards de rol │   │  · Realtime                  │
│  - pg-boss       │   └─────────────────────────────┘
└───┬──────────┬───┘
    │          │
    ▼          ▼
┌─────────┐  ┌──────────────┐
│ Judge0  │  │ Mux / Stream │
│ sandbox │  │  video       │
└─────────┘  └──────────────┘
```

## Estructura de carpetas (monorepo pnpm + Turborepo)

```
aulawm/
├── apps/
│   ├── web/                        # Next.js 15
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── registro/page.tsx
│   │   │   │   └── recuperar/page.tsx
│   │   │   ├── (alumno)/
│   │   │   │   ├── inicio/page.tsx
│   │   │   │   ├── cursos/[cursoId]/page.tsx
│   │   │   │   ├── cursos/[cursoId]/clases/[claseId]/page.tsx
│   │   │   │   ├── simulacros/[intentoId]/page.tsx
│   │   │   │   ├── simulacros/[intentoId]/reporte/page.tsx
│   │   │   │   ├── labs/[labId]/page.tsx
│   │   │   │   ├── biblioteca/page.tsx
│   │   │   │   └── perfil/page.tsx
│   │   │   └── (docente)/
│   │   │       ├── panel/page.tsx
│   │   │       ├── examenes/nuevo/page.tsx
│   │   │       ├── labs/nuevo/page.tsx
│   │   │       ├── notas/[grupoId]/page.tsx
│   │   │       └── publicar/page.tsx
│   │   ├── components/
│   │   │   ├── ui/                 # primitivas: Button, Card, Chip, Switch, Badge
│   │   │   ├── rail/               # navegación lateral
│   │   │   ├── examen/             # Cuadernillo, Cronometro, OpcionRespuesta
│   │   │   ├── lab/                # EditorMonaco, PanelPruebas, Consola
│   │   │   └── notas/              # PlanillaGrid (columna fija + celdas editables)
│   │   └── lib/
│   │       ├── supabase/           # createBrowserClient / createServerClient
│   │       └── api.ts              # cliente typed hacia Nest
│   └── api/                        # Nest.js
│       └── src/
│           ├── auth/               # JwtSupabaseGuard, RolesGuard, @Roles()
│           ├── cursos/
│           ├── clases/
│           ├── examenes/           # banco, plantillas, intentos, calificación
│           ├── labs/               # definición, casos de prueba, envíos
│           ├── entregas/           # talleres, actividades, archivos
│           ├── notas/              # ponderaciones, definitiva, publicación
│           ├── analitica/          # panel del docente
│           ├── runner/             # cliente Judge0
│           ├── storage/            # URLs firmadas
│           └── jobs/               # pg-boss workers
├── packages/
│   ├── db/                         # migraciones SQL + tipos generados
│   ├── shared/                     # DTOs y zod schemas compartidos
│   └── tokens/                     # design tokens (ver más abajo)
└── supabase/
    └── migrations/
```

## Modelo de datos

El esquema completo está en `sql/schema.sql`. Resumen de las 22 tablas:

**Identidad y organización**
`perfiles` (extiende `auth.users`), `roles_usuario`, `grupos` (10°A, 10°B…),
`matriculas` (estudiante ↔ grupo ↔ año), `periodos` (1–4 con fechas de cierre).

**Contenido**
`cursos`, `modulos`, `clases` (tipo: video | lectura | lab | quiz), `recursos`
(material de apoyo: PDF, XLSX, DOCX, PPTX, SQL, REPO, SLD), `apuntes`
(apunte del estudiante con `segundo_video`), `progreso_clase`.

**Evaluación ICFES**
`competencias` (Lectura crítica, Razonamiento cuantitativo, Sociales, Ciencias, Inglés,
Tecnología, Emprendimiento), `preguntas` (banco: contexto, enunciado, 4 opciones,
clave, retroalimentación, dificultad, estadística de acierto), `examenes` (plantilla:
nombre, minutos, flags), `examen_preguntas` (orden), `intentos`
(estudiante, inicio, fin, estado), `respuestas` (intento, pregunta, opción, marcada,
segundos), `resultados_competencia` (puntaje, nivel 1–4, percentil).

**Laboratorios**
`labs` (enunciado, lenguaje, puntos, intentos, flags, starter, solución),
`lab_casos` (nombre, aserción, puntos, visible), `lab_envios`
(código, veredicto, puntos, salida del runner), `lab_pistas`.

**Entregas y notas**
`asignaciones` (taller | actividad | laboratorio | video | lectura | examen; fechas de
apertura y cierre; grupos destino), `rubricas` + `rubrica_criterios`,
`entregas` (archivos, estado, fecha, tarde), `calificaciones`
(asignación, estudiante, valor, retroalimentación, calificador: auto | docente),
`ponderaciones` (categoría → % por curso y periodo: Talleres 30, Labs 30, Simulacros 25,
Actitudinal 15), `notas_definitivas` (materializada, recalculada por trigger).

**Notas clave de diseño de datos**

- La **clave de la pregunta** (`preguntas.clave`) nunca sale al cliente del estudiante.
  Se expone solo en la respuesta de calificación o si el examen tiene
  `mostrar_clave_al_terminar = true`.
- `respuestas` guarda `segundos_empleados` para alimentar el panel "Ritmo".
- `notas_definitivas` es una tabla, no una vista: la planilla del docente hace scroll sobre
  ~35 filas × 8 columnas y debe leerse en una consulta. Se recalcula con trigger
  `AFTER INSERT OR UPDATE ON calificaciones`.
- Todas las tablas de estudiante llevan RLS. Política base:
  `estudiante ve solo sus filas; docente ve las de los grupos que dicta; coordinación ve todo`.

## Contrato de API

El detalle con DTOs está en `api/endpoints.md`. Resumen por módulo:

```
POST   /auth/registro                     alta de estudiante (grado, grupo, consentimiento)
GET    /me                                perfil + roles + matrícula vigente

GET    /cursos                            cursos del usuario con % de avance
GET    /cursos/:id                        módulos + clases + estado por clase
POST   /clases/:id/progreso               marcar visto / segundo alcanzado
GET    /clases/:id/apuntes                apuntes del estudiante
POST   /clases/:id/apuntes                { segundo, texto }

GET    /examenes/:id/intento              crea o retoma el intento; devuelve cuadernillo SIN claves
PATCH  /intentos/:id/respuestas           { preguntaId, opcion, marcada, segundos }  (idempotente)
POST   /intentos/:id/finalizar            cierra, califica, devuelve reporte por competencia
GET    /intentos/:id/reporte              puntaje global, niveles, percentil, recomendaciones

GET    /labs/:id                          enunciado, starter, casos visibles, intentos restantes
POST   /labs/:id/envios                   { codigo } → 202 + jobId (calificación asíncrona)
GET    /lab-envios/:id                    veredicto, puntos, salida de cada caso

GET    /asignaciones?grupoId=&periodoId=   lista con estado de entrega
POST   /asignaciones/:id/entregas          multipart o confirmación de URL firmada
POST   /storage/url-subida                 { asignacionId, nombre, mime } → URL firmada

# ---- solo docente ----
POST   /preguntas                          crear pregunta en el banco
GET    /preguntas?competenciaId=&q=        buscar en el banco (con % de acierto)
POST   /preguntas/importar                 CSV → preguntas
POST   /examenes                           plantilla + flags
PUT    /examenes/:id/preguntas             set de preguntas y orden
POST   /examenes/:id/publicar              { grupoIds, abre, cierra }

POST   /labs                               definición + casos + pistas
POST   /labs/:id/validar                   corre los casos contra la solución del docente
POST   /labs/:id/publicar

GET    /notas/:grupoId?periodoId=          planilla completa (columnas + filas + promedios)
PATCH  /notas/calificaciones               batch de celdas editadas (autoguardado)
POST   /notas/:grupoId/publicar            hace visibles las notas al estudiante
GET    /notas/:grupoId/export.xlsx         exportación

GET    /analitica/:grupoId                 KPIs, matriz de dominio, alertas, distribución
```

**Convenciones**

- Todo bajo `/api/v1`. Errores en formato *problem+json*.
- El JWT de Supabase viaja en `Authorization: Bearer`. Nest lo verifica con la JWK del proyecto
  (`SUPABASE_JWT_SECRET` en HS256, o JWKS si migran a asimétrico) y arma `req.user`
  con `{ sub, roles, grupos }`.
- `PATCH /intentos/:id/respuestas` debe ser idempotente y tolerar reintentos: el estudiante
  puede perder conexión a mitad del simulacro.

## El runner de código (la pieza crítica)

Nunca ejecutar código de estudiantes en el proceso de Nest. Flujo:

1. `POST /labs/:id/envios` guarda el código, encola un job en pg-boss, responde `202` con `jobId`.
2. El worker arma el paquete (starter + código del estudiante + archivo de pruebas del docente)
   y lo manda a **Judge0** con límites: 5 s de CPU, 256 MB, sin red, sistema de archivos de solo
   lectura, salida truncada a 64 KB.
3. Cada caso de prueba se corre por separado para poder puntuar parcialmente.
4. El worker escribe `lab_envios.veredicto`, los puntos por caso, y dispara
   `INSERT INTO calificaciones` si el lab tiene `autocalificar = true`.
5. El front escucha por Supabase Realtime en `lab_envios` y actualiza la consola.

Lenguajes del pénsum: JavaScript/Node (vitest), Python (pytest), SQL (contenedor MySQL o
Postgres efímero con el volcado `colegio_db`), HTML/CSS (verificación con jsdom + aserciones
sobre el DOM, no captura de pantalla).

Para SQL conviene un esquema plantilla en Supabase y ejecutar la consulta del estudiante en una
**transacción con ROLLBACK** contra una copia, comparando el resultset ordenado.

## Los labs de Office

El mockup dibuja una hoja de Excel; **no calcula**. Tres caminos, en orden de costo:

1. **Entrega de archivo + verificación en servidor** (recomendado para empezar).
   El estudiante trabaja en Excel de verdad y sube el .xlsx. El worker lo abre con
   `exceljs` y verifica: que D2 contenga una fórmula `BUSCARV`/`VLOOKUP` con
   coincidencia exacta, que el rango llegue a D40, que exista una tabla dinámica,
   que haya un gráfico. Da retroalimentación por criterio, igual que la rúbrica del diseño.
   Word y PowerPoint: `mammoth` / `pptxgenjs` para leer estilos, jerarquía de títulos, TOC.
2. **Editor incrustado**: OnlyOffice Docs Community o Collabora en un contenedor. El estudiante
   edita dentro del LMS y el archivo queda en Storage.
3. **Microsoft Graph** con licencias educativas del colegio: edición en Office real y lectura
   del archivo por API. La mejor experiencia, la que más depende de trámites.

El diseño ya soporta el camino 1: cada lab de ofimática tiene guía paso a paso, botón
*Verificar paso* y zona de subida.

## Autenticación y roles

- Supabase Auth con email/password. Dominio institucional validado en el registro.
- Tabla `roles_usuario` con `estudiante | docente | coordinacion`. El rol va en el JWT vía
  *custom access token hook* de Supabase, para que las políticas RLS lo lean sin JOIN.
- El registro de estudiante queda `pendiente` hasta que el docente o coordinación lo aprueba
  y lo asocia a un grupo. Evita que cualquiera con el dominio entre a un grupo ajeno.
- Recuperación de contraseña: `supabase.auth.resetPasswordForEmail`, enlace de 30 minutos
  (el copy del diseño ya lo dice). Alternativa presencial en la sala de sistemas, también
  contemplada en el diseño.

## Lo que hay que decidir antes de codificar

1. **Menores de edad.** Ley 1581 de 2012 y Decreto 1377 de 2013: se necesita autorización del
   acudiente, política de tratamiento publicada, y ruta para eliminar o exportar datos.
   Definir retención (¿se borra al graduarse?) antes de escribir la primera migración.
2. **Notas oficiales.** ¿La planilla de AulaWM es la fuente de verdad o se sincroniza con el
   sistema académico del colegio? Si es lo segundo, hace falta exportación en el formato exacto
   que ese sistema acepte, y decidir quién gana en conflicto.
3. **Escala del runner.** 34 estudiantes enviando código a la vez en la hora de clase.
   Dimensionar Judge0 para ~40 ejecuciones concurrentes de 5 s.
4. **Conectividad.** Si la sala de sistemas tiene internet inestable, el simulacro necesita
   guardado local (IndexedDB) y reenvío al reconectar. Cambia el diseño del cliente del examen.
5. **Video.** Cuántas horas y quién paga el transcoding. Mux cobra por minuto codificado y
   por minuto visto.

## Plan por fases

**Fase 1 — Base (4–6 semanas)**
Auth y roles · cursos, módulos, clases · material de apoyo con Storage · asignaciones y
entrega de archivo · planilla de notas con ponderaciones · panel del docente básico.
Ya es un LMS usable sin runner ni video propio (los videos se enlazan a YouTube sin listar).

**Fase 2 — ICFES (3–4 semanas)**
Banco de preguntas · constructor de examen · intento con cronómetro y guardado incremental ·
calificación y reporte por competencias · modo entrenamiento.

**Fase 3 — Labs de código (4–6 semanas)**
Judge0 · editor Monaco · casos de prueba visibles y ocultos · constructor de labs ·
autocalificación hacia `calificaciones`.

**Fase 4 — Ofimática y video (3–4 semanas)**
Verificación de .xlsx/.docx/.pptx en servidor · Mux · apuntes con marca de tiempo ·
gamificación (racha, XP, insignias, ranking).

---

# Pantallas

19 pantallas en el prototipo, navegables desde el rail izquierdo. El archivo es
`LMS Wilmer Mosquera.dc.html`; cada pantalla es un bloque `sc-if` con un comentario que la
nombra en mayúsculas (`<!-- ===== ICFES ===== -->`), así que se localizan buscando ese comentario.

### Shell de la aplicación

- **Barra superior** — 63 px de alto, `position: sticky`, fondo `rgba(20,18,16,.86)` con
  `backdrop-filter: blur(18px)`, borde inferior `1px solid rgba(245,242,236,.09)`.
  Izquierda: logotipo (cuadrado 34 px, radio 10, fondo `#7C5CFF`, letra "W" 800/15px) +
  "AulaWM" 700/14.5px con "WM" en violeta + "WILMER MOSQUERA" 500/9px mono con
  `letter-spacing: .14em`. Centro: caja de búsqueda de 420 px máximo con "⌘K".
  Derecha: conmutador Alumno/Docente (pastilla de 3 px de padding) + avatar de 32 px con
  degradado `linear-gradient(140deg,#C6FF3D,#7C5CFF)` e iniciales.
- **Rail izquierdo** — 214 px fijos, `position: sticky` bajo la barra, con scroll propio.
  16 ítems numerados 01–16, cada uno 9 px/10 px de padding, radio 9. El activo:
  fondo `rgba(124,92,255,.18)` + barra vertical de 2 px en `#7C5CFF` pegada al borde izquierdo.
  Al pie: tarjeta "Periodo 3" con borde punteado lima, y "Cerrar sesión".
- **Área de contenido** — `padding: 26px 28px 60px`, ancho fluido.

### 1. Inicio (alumno)

Saludo con nombre y una línea de estado ("Vas 2 sesiones adelante") en 800/40px con
`letter-spacing: -.03em`, la segunda línea al 42 % de opacidad. Dos botones primarios.
Cuatro tarjetas KPI en `repeat(auto-fit, minmax(190px,1fr))`: racha (con 7 segmentos, 6 llenos),
XP y puesto, labs superados con barra, y "Listo para ICFES" (esta última con fondo
`linear-gradient(150deg,rgba(124,92,255,.28),rgba(124,92,255,.06))` y borde violeta).
Debajo, dos columnas: lista de cursos con chip de 3 letras, barra de progreso de 64 px y
porcentaje; y una columna con "Por entregar" (4 filas con día en mono, HOY en `#FF6B4A`) más
una tarjeta "Continuar viendo".

### 2. Curso

Cabecera de 22 px de padding, radio 18, con degradado violeta en diagonal 135°. Título del
programa en eyebrow lima, nombre en 800/34px, chips de tecnologías (el activo con fondo lima
translúcido). A la derecha, avance y nota en 800/30px.
Cuerpo: acordeón de 4 módulos (el segundo abierto por defecto) — cada ítem con badge de tipo
(VID violeta, LAB lima, QUIZ gris), nombre, duración y punto de estado.
Columna derecha: tarjeta del docente con avatar degradado, y "Material de apoyo" con badges
PDF/REPO/SLD.

### 3. Reproductor con apuntes

Video 16:9 con botón de play de 64 px en lima, barra de progreso segmentada por capítulos,
y controles sobre un degradado hacia negro. Debajo: título de la clase y pestañas
Capítulos / Transcripción / Preguntas / Recursos (la activa con subrayado lima de 2 px).
Columna derecha: campo de apunte anclado al segundo actual (borde violeta), apuntes previos
con borde izquierdo lima de 2 px, y una tarjeta "Resumen automático" con borde punteado.

### 4. Simulacro ICFES

Barra de sesión con badge "EN CURSO" naranja, cronómetro en 700/24px mono (pasa a `#FF6B4A`
bajo 5 minutos) y botón de modo entrenamiento.
Tres columnas: contexto de lectura (13.5px/1.68 — el único bloque de lectura larga del
producto), pregunta con 4 opciones, y navegador.
Las opciones cambian de borde y fondo según el estado: sin marcar `rgba(245,242,236,.11)`,
marcada violeta, correcta lima con "✓", incorrecta naranja con "✕". En modo entrenamiento
aparece el bloque de retroalimentación con fondo lima al 9 %.
Navegador: rejilla de 50 celdas cuadradas, `minmax(30px,1fr)` — actual violeta, respondida
lima al 65 %, sin responder gris. Debajo, panel "Ritmo" con promedio vs ideal.

### 5. Resultados

Puntaje global en 900/76px con `line-height: .85` sobre degradado lima. Barras por competencia
con etiqueta "68 / 100 · nivel 3". Fila de niveles 1–4 con el alcanzado en violeta.
Abajo: "Qué repasar primero" (3 filas con badge VIDEO/DRILL/PDF) e histograma del grupo de
12 barras con la del estudiante en lima.

### 6. Lab de programación (vista del estudiante)

Tres columnas: enunciado + árbol de archivos + pista; editor sobre fondo `#0E0C0B` con
números de línea al 24 % de opacidad, resaltado de sintaxis (palabras clave `#7C5CFF`,
funciones y atributos `#C6FF3D`, etiquetas `#FF9E6B`, cadenas `#8AE9C1`), líneas activas con
fondo violeta al 12 % y cursor que parpadea (`animation: blink 1.1s step-end infinite`);
y panel inferior con pestañas CONSOLA / PRUEBAS / PREVIEW.
Al pulsar *Ejecutar pruebas* la consola pasa de "Listo…" a tres líneas verdes y un badge
"3/3 pruebas · 20 pts obtenidos".

### 7. Lab de Excel

La hoja se dibuja con la cromática real de Excel dentro del marco oscuro: cinta `#1D6F42`,
barra de fórmulas `#EDEAE4`, celdas `#F7F5F1` con bordes `#D6D2C9`, texto `#1B1A17`.
Columna D resaltada en verde; la fila 6 muestra `#N/A` en rojo `#F8D7D3`/`#8E2118` — es el
error que la verificación explica. Pestañas de hoja al pie.
Derecha: guía de 6 pasos (hechos con ✓ lima, actual con ▸ violeta y fondo, pendientes en gris)
y panel de verificación con zona de subida.

### 8. Lab de Word / PowerPoint

Conmutador Word/PowerPoint. Word: cinta `#2B579A`, página blanca con Georgia 13.5px/1.85,
un fragmento resaltado en amarillo `#FFF3B0` y un comentario del docente con borde izquierdo
azul. PowerPoint: cinta `#B7472A`, tira de miniaturas 16:9 a la izquierda y diapositiva
seleccionada sobre fondo `#DEDAD3`.
Derecha: rúbrica con puntos por criterio y zona de arrastre para .docx y .pptx.

### 9. Lab de bases de datos

Izquierda: esquema `colegio_db` con tres tarjetas de tabla (la activa con borde violeta),
campos en mono con PK en lima y FK en naranja. Centro: editor SQL con la consulta con JOIN
resaltada, indicador "● conectado" en lima; abajo, tabla de resultados con el promedio en
lima y negrita.

### 10. Panel del docente

Cinco KPI (el de "En riesgo" con fondo y texto naranja). Tabla de dominio por estudiante:
cada fila es el nombre + 6 celdas de 20 px de alto coloreadas por nivel
(lima = dominado, violeta = en progreso, naranja al 70 % = requiere apoyo, gris = sin iniciar)
+ promedio a la derecha. Columna lateral con alertas (borde izquierdo de 2 px según severidad)
y conteo del banco de preguntas.

### 11. Crear examen ICFES (docente)

Tres columnas. **Configuración**: nombre, número de preguntas, tiempo, chips de competencias
con multiplicador, y 5 interruptores (mezclar preguntas, mezclar opciones, mostrar clave,
cronómetro visible, permitir retomar).
**Editor de pregunta**: contexto, enunciado (borde violeta), 4 opciones donde se marca la clave
con un clic — la marcada toma borde lima y círculo lima con ✓, y el rótulo "clave: B" se
actualiza —, retroalimentación sobre fondo lima al 7 %, y barra de acciones
(Guardar / Duplicar / Enviar al banco / Eliminar en naranja a la derecha).
**Estructura**: rejilla de 50 con lista en lima, la que se edita en violeta, vacías en gris;
y "Traer del banco" con % de acierto histórico e importación de .csv.

### 12. Crear lab de código (docente)

Selector de lenguaje (JavaScript, Python, SQL, HTML/CSS) que cambia el rótulo del runner
("vitest · node 22", "pytest · python 3.12", "MySQL 8 · sandbox").
Editor con tres pestañas: `starter.jsx`, `solucion.jsx`, `pruebas.test.js`.
**Casos de prueba**: 5 filas con puntaje en badge lima, aserción en mono, y estado
visible/oculto — los ocultos muestran "oculto para el estudiante" en lugar de la aserción.
Interruptores: autocalificar, mostrar consola, permitir copiar y pegar, bloquear al cerrar
pestaña, antiplagio. Pistas progresivas numeradas.

### 13. Notas del periodo (docente)

Planilla con **primera columna fija** (`position: sticky; left: 0`) sobre fondo `#211E1B` en
la cabecera y `#1C1A17` en las filas. Cabecera de categorías con ponderaciones
(Talleres 30 %, Labs 30 %, Simulacros 25 %, Actitudinal 15 %) — la activa en violeta.
7 columnas de actividad de 78 px mínimo, celdas clicables. Los faltantes ("—") van en
naranja `#FF8465` con fondo naranja al 9 %. Definitiva en lima, o naranja si es menor a 3.0.
Fila de promedios al pie con borde superior.
Abajo: cola de calificación (AUTO violeta vs MANUAL naranja) e histograma de distribución
por rango de nota.

### 14. Subir taller (docente)

Selector de tipo en 6 tarjetas (Taller, Actividad, Laboratorio, Video, Lectura, Examen) —
la activa con borde y glifo lima. Título e instrucciones. Zona de arrastre con borde punteado
violeta, lista de formatos y límite de 200 MB. Lista de archivos subidos con barra de progreso
por archivo (dos al 100 % en lima, un video al 62 % en violeta).
Derecha: grupos destino, fechas de apertura y cierre, 4 interruptores de política
(entregas tarde, notificar, entrega en grupo, publicar rúbrica) y rúbrica de 100 puntos.

### 15. Material de apoyo

Chips de filtro (el activo en lima) y rejilla `minmax(232px,1fr)` de 9 tarjetas de 170 px
mínimo, cada una con badge de tipo coloreado, tamaño, título, descripción y curso al pie.

### 16. Perfil y logros

Cabecera con degradado lima→violeta a 120°, avatar de 84 px radio 24, nivel/XP/racha.
Rejilla de 8 insignias `minmax(112px,1fr)` — las obtenidas con fondo lima al 9 % y glifo sobre
cuadrado lima, las pendientes con borde punteado y `opacity: .55`.
Derecha: ranking del grupo (la fila propia con fondo violeta al 16 % y borde) y certificados.

### 17–19. Login, Registro, Recuperar contraseña

Pantallas sin el shell. Rejilla de dos columnas `minmax(320px,1fr)`.
**Panel izquierdo** (marca): fondo `#0E0C0B` con dos degradados radiales, logotipo arriba,
titular en 900/clamp(34px,4.6vw,58px) con `letter-spacing: -.045em`, párrafo de apoyo,
tres chips de credibilidad, y la ubicación al pie.
**Panel derecho** (formulario, 404 px máximo, centrado):
- *Login*: correo, contraseña con "VER", interruptor "mantener la sesión", botón lima
  "Ingresar", separador "O BIEN", SSO institucional, "Soy docente" (entra al panel docente),
  y enlace a registro.
- *Registro*: indicador de 2 pasos, nombres y apellidos en fila, correo, selección de grado
  en 6 chips, contraseña con medidor de 4 segmentos (3 llenos) y consejo, casilla de
  tratamiento de datos ya marcada.
- *Recuperar*: icono ⟳ en cuadrado violeta, explicación del enlace de 30 minutos, campo de
  correo, botón violeta; al enviar aparece un aviso lima de confirmación. Nota final sobre
  el restablecimiento presencial.

---

# Interacciones y comportamiento

**Navegación** — el rail cambia de pantalla sin recarga. En producción son rutas reales;
el estado activo se deriva de `usePathname()`.

**Conmutador Alumno/Docente** — Alumno lleva a Inicio, Docente al Panel. Se muestra activo
para cualquiera de las 5 pantallas de docente.

**Simulacro** — el cronómetro corre en `setInterval` de 1 s desde `componentDidMount` y se
limpia en `componentWillUnmount`. Al marcar una opción, en modo entrenamiento aparece la
retroalimentación de inmediato; sin ese modo solo se marca la selección. El navegador de 50
celdas salta entre preguntas y refleja las respondidas.
En producción: guardado incremental con `PATCH` idempotente por respuesta, más IndexedDB
como respaldo si la conexión se cae. El tiempo restante debe calcularse contra
`intentos.inicio` en el servidor, nunca contra el reloj del navegador.

**Lab de código** — *Ejecutar pruebas* cambia la consola a resultados. En producción es
asíncrono: `202` + suscripción a Realtime, con estado "en cola" y "ejecutando" antes del
veredicto.

**Excel** — *Verificar paso* alterna entre dos mensajes de verificación. En producción,
verificación en servidor sobre el .xlsx subido, devolviendo un resultado por criterio de rúbrica.

**Editor de pregunta** — clic en una opción la fija como clave y actualiza el rótulo.

**Constructor de lab** — el selector de lenguaje cambia el runner mostrado; las pestañas
cambian el contenido del editor entre starter, solución y pruebas.

**Interruptores** — todos los switches (examen, lab, publicación, recordar sesión) son
funcionales, con transición de 160 ms en el fondo de la pista y en la posición del pomo.

**Estados que faltan diseñar** (el prototipo no los cubre; hay que definirlos en
implementación): vacío (curso sin clases, grupo sin estudiantes), carga (skeleton de la
planilla y del cuadernillo), error de red durante el examen, y sin permiso.

**Responsive** — todo el layout usa `repeat(auto-fit, minmax(...))` y `flex-wrap`, así que
reflúe sin media queries. Lo que no reflúe y necesita trabajo aparte: la planilla de notas y
la hoja de Excel (scroll horizontal con columna fija, ya implementado) y el rail lateral,
que en móvil debe volverse cajón o barra inferior.

---

# Design tokens

Los mismos valores en `tokens/tokens.json` y `tokens/tokens.css`.

## Color

| Token | Valor | Uso |
|---|---|---|
| `--ground` | `#141210` | Fondo de la aplicación (near-black cálido) |
| `--ground-deep` | `#0E0C0B` | Editor de código, panel de marca en auth, video |
| `--panel` | `#1C1A17` | Tarjetas y paneles |
| `--panel-2` | `#211E1B` | Cabecera y columna fija de la planilla |
| `--panel-3` | `#151312` | Barra de pestañas del editor |
| `--ink` | `#F5F2EC` | Texto principal |
| `--accent` | `#7C5CFF` | Violeta: acción secundaria, estado activo, "en progreso" |
| `--lime` | `#C6FF3D` | Lima: acción primaria, éxito, dominado |
| `--warn` | `#FF6B4A` | Naranja: riesgo, urgente, faltante (sobre fondo) |
| `--warn-text` | `#FF8465` | Naranja aclarado para **texto** naranja sobre `--panel` |

Opacidades de tinta sobre los fondos oscuros. Se subieron respecto al primer borrador para
cumplir 4.5:1 en tipografía pequeña:

- Texto secundario y metadatos: `rgba(245,242,236,.66)` a `.7`
- Cuerpo atenuado: `rgba(245,242,236,.78)` a `.86`
- Bordes: `rgba(245,242,236,.09)` (panel), `.11` a `.16` (campos y botones fantasma)
- Rellenos suaves: `rgba(245,242,236,.03)` a `.06`

Cromática de aplicaciones de Office (dentro del marco oscuro, intencionalmente):
Excel `#1D6F42`, Word `#2B579A`, PowerPoint `#B7472A`; papel `#F7F5F1`, cinta `#EDEAE4`,
bordes `#D6D2C9`, tinta `#1B1A17`, gris de interfaz `#6E6960`.

Sintaxis del editor: palabras clave `#7C5CFF`, identificadores y atributos `#C6FF3D`,
etiquetas `#FF9E6B`, cadenas y números `#8AE9C1`, número de línea `rgba(245,242,236,.4)`.

## Tipografía

Dos familias de Google Fonts, pesos 400–900:

- **Archivo** — interfaz y titulares.
- **Azeret Mono** — etiquetas, datos, código, cronómetros, todo lo tabular.

| Rol | Valor |
|---|---|
| Display | `900 clamp(34px,4.6vw,58px)/1`, `letter-spacing: -.045em` |
| Cifra grande | `900 76px/.85`, `-.05em` |
| H1 de pantalla | `800 34px/1.05`, `-.03em` |
| H1 secundario | `800 29px/1.05`, `-.03em` |
| H2 | `700 17-18px/1.2`, `-.01em` |
| H3 | `700 14-15px/1.2` |
| Cuerpo | `400 13-13.5px/1.6-1.7` |
| Cuerpo de lectura (ICFES) | `400 13.5px/1.68` |
| Etiqueta de UI | `500-600 12-12.5px/1.35` |
| Eyebrow | `600 9-9.5px/1` mono, `letter-spacing: .14-.18em`, mayúsculas |
| Dato / mono | `500-700 10.5-12px/1` mono |
| Código | `400 13px/1.85` mono |

`text-wrap: pretty` en todo bloque de texto corrido.

## Espaciado, radios, movimiento

- Escala de espaciado: 4, 6, 7, 8, 9, 11, 12, 14, 16, 18, 20, 22, 24, 26 px.
- Radios: 5–7 px (badge, celda), 9–11 px (botón, campo, fila), 12–14 px (tarjeta),
  16–18 px (panel, cabecera), 20 px (chip pastilla), 24 px (avatar grande), 50 % (círculo).
- Bordes: 1 px sólido; punteado de 1 px para zonas de subida y elementos pendientes.
- Sombras: casi ninguna. Solo el logotipo (`0 6px 22px rgba(124,92,255,.45)`) y la
  diapositiva de PowerPoint (`0 10px 30px rgba(0,0,0,.25)`).
- Transiciones: 160 ms en interruptores, 180 ms en el giro del acordeón.
- `@keyframes blink` (1.1 s, `step-end`) para el cursor del editor.
- Barra de scroll personalizada: 8 px, pomo `rgba(245,242,236,.16)`, riel transparente.

---

# Recursos

**Fuentes** — Archivo y Azeret Mono desde Google Fonts. Autoalojarlas con `next/font/google`
para evitar el salto de fuente.

**Iconografía** — el prototipo usa caracteres tipográficos (★ ◆ ▲ ● ⬢ ✦ ◇ ✚ ⟳ ▶ ✓ ✕ ↩ ▾)
como placeholder deliberado. En producción hay que elegir un set real (Lucide encaja con el
peso de la tipografía) y reemplazarlos uno a uno.

**Imágenes** — no hay ninguna. Miniaturas de video, avatares y portadas de curso son cajas con
la etiqueta de lo que va ahí. **Hay que pedirle al docente el material real**: fotos de clase,
portadas por materia, y el escudo de la institución.

---

# Archivos de este paquete

```
design_handoff_aulawm/
├── README.md                    ← este documento
├── LMS Wilmer Mosquera.dc.html  ← el prototipo, 19 pantallas navegables
├── sql/schema.sql               ← esquema Postgres/Supabase con RLS
├── api/endpoints.md             ← contrato REST con DTOs
└── tokens/
    ├── tokens.json
    └── tokens.css
```

El prototipo se abre en cualquier navegador. Cada pantalla está delimitada por un comentario
HTML en mayúsculas; el rail izquierdo las recorre todas.
