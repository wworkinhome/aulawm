# Contrato de API — AulaWM

Base: `/api/v1`. Nest.js 11, REST, JSON. Errores en formato *problem+json* (RFC 9457).

## Autenticación

El navegador se autentica contra Supabase Auth y manda el access token a Nest:

```
Authorization: Bearer <supabase_access_token>
```

`JwtSupabaseGuard` verifica la firma (HS256 con `SUPABASE_JWT_SECRET`, o JWKS si el proyecto
usa claves asimétricas) y arma `req.user`:

```ts
type RequestUser = {
  sub: string;                                  // uuid del perfil
  roles: ('estudiante' | 'docente' | 'coordinacion')[];
  grupos: string[];                             // grupos que dicta (docente) o donde está matriculado
};
```

`RolesGuard` + `@Roles('docente')` protege los endpoints de autoría.
Nest habla con Supabase usando la **service_role key** (salta RLS): todas las reglas de
autorización viven en los guards y en los servicios, no en el cliente.

## Convenciones

- Paginación por cursor: `?cursor=<id>&limit=50`, respuesta `{ data, nextCursor }`.
- Fechas siempre ISO 8601 con zona (`2026-09-08T13:00:00-05:00`).
- Notas en escala 0.00–5.00 (`numeric(4,2)`). Los puntos de labs y talleres son enteros.
- Idempotencia en escrituras que el cliente puede reintentar: cabecera `Idempotency-Key`.
- Todo endpoint de docente valida que el recurso pertenezca a un grupo que dicta.

## Errores

```json
{
  "type": "https://aulawm.edu.co/errors/intento-expirado",
  "title": "El intento ya cerró",
  "status": 409,
  "detail": "El tiempo del simulacro terminó a las 15:47.",
  "instance": "/api/v1/intentos/9f1c.../respuestas"
}
```

Códigos usados: `400` validación, `401` sin token, `403` sin rol o fuera de grupo,
`404` no existe o no visible, `409` conflicto de estado (intento cerrado, entrega tras
el cierre, intentos agotados), `422` regla de dominio, `429` límite de envíos al runner.

---

# Identidad

### `POST /auth/registro`

Público. Crea el usuario en Supabase Auth y el perfil, en estado de matrícula `pendiente`.

```ts
// request
{
  nombres: string;
  apellidos: string;
  correo: string;            // debe pertenecer al dominio institucional
  password: string;          // mínimo 8, al menos un número o símbolo
  grupoNombre: string;       // '10°B' — de los chips de la pantalla de registro
  consentimiento: {
    acudiente: string;
    documento: string;
    parentesco?: string;
  };
}
// 201
{ usuarioId: string; estado: 'pendiente' }
```

Regla: el estudiante no ve contenido hasta que un docente o coordinación aprueba la matrícula.

### `GET /me`

```ts
{
  perfil: { id, nombres, apellidos, correo, avatarUrl };
  roles: Rol[];
  matricula: { grupoId, grupoNombre, anio, estado } | null;
  periodoVigente: { id, numero, nombre, cierreDeNotas };
}
```

### `POST /matriculas/:id/aprobar` — `@Roles('docente','coordinacion')`

---

# Cursos y clases

### `GET /cursos`

Cursos del usuario. Para el estudiante, los de su grupo; para el docente, los que dicta.

```ts
{
  data: Array<{
    id: string;
    nombre: string;            // 'Fullstack en JavaScript'
    codigo: string;            // 'FSJ'
    color: string | null;
    docente: { id, nombres, apellidos };
    avance: number;            // 0..100  — alimenta la barra del dashboard
    ultimaClase: { id, titulo, tipo } | null;
    nota: number | null;       // definitiva del periodo vigente
  }>;
}
```

### `GET /cursos/:id`

```ts
{
  curso: { id, nombre, codigo, descripcion, tecnologias: string[] };
  avance: number;
  nota: number | null;
  modulos: Array<{
    id: string;
    orden: number;
    titulo: string;
    clases: Array<{
      id, orden, tipo: 'video'|'lectura'|'lab'|'quiz',
      titulo, duracionSeg: number | null,
      completada: boolean
    }>;
  }>;
  recursos: Array<{ id, tipo, titulo, descripcion, bytes, url }>;
  docente: { id, nombres, apellidos, avatarUrl };
}
```

### `GET /clases/:id`

Para `tipo: 'video'` incluye el token de reproducción (Mux playback token, TTL corto):

```ts
{
  clase: { id, titulo, tipo, descripcion };
  video: { assetId, playbackToken, duracionSeg, capitulos: Array<{segundo, titulo}> } | null;
  progreso: { segundoAlcanzado: number; completada: boolean };
  recursos: Array<{ id, tipo, titulo, url }>;
  siguiente: { id, titulo } | null;
}
```

### `POST /clases/:id/progreso`

Idempotente, se llama cada ~15 s de reproducción.

```ts
{ segundoAlcanzado: number; completada?: boolean }  // → 204
```

### `GET /clases/:id/apuntes` · `POST /clases/:id/apuntes` · `DELETE /apuntes/:id`

```ts
// POST
{ segundo: number | null; texto: string }
// 201
{ id, segundo, texto, creadoEn }
```

---

# Simulacros ICFES

### `GET /examenes/:id/intento`

Crea el intento o retoma el que esté `en_curso`. **Nunca devuelve la clave.**

```ts
{
  intentoId: string;
  examen: { nombre, minutos, cronometroVisible, modoEntrenamiento: boolean };
  restanteSeg: number;            // calculado en servidor contra intentos.inicio
  preguntas: Array<{
    id: string;
    orden: number;                 // 1..50, ya mezclado si aplica
    competencia: { id, nombre };
    contextoId: string | null;     // varias preguntas comparten lectura
    enunciado: string;
    opciones: string[];            // 4, ya mezcladas si aplica
  }>;
  contextos: Array<{ id, titulo, texto }>;
  respuestas: Array<{ preguntaId, opcion: number | null, marcada: boolean }>;
}
```

`restanteSeg` es la única fuente de verdad del cronómetro. El cliente lo descuenta
localmente pero lo resincroniza en cada `PATCH`.

### `PATCH /intentos/:id/respuestas`

Idempotente. Acepta una o varias respuestas para tolerar reenvíos tras pérdida de conexión.

```ts
// request
{
  respuestas: Array<{
    preguntaId: string;
    opcion: number | null;         // 0..3, null = borrar
    marcada?: boolean;
    segundosEmpleados: number;
  }>;
}
// 200
{
  guardadas: number;
  restanteSeg: number;
  // solo si el examen tiene modo entrenamiento activo:
  feedback?: Array<{ preguntaId, correcta: boolean, clave: number, retroalimentacion: string }>;
}
```

`409` si el intento ya cerró o el tiempo expiró.

### `POST /intentos/:id/finalizar`

Cierra, califica y devuelve el reporte. Idempotente.

```ts
{
  puntajeGlobal: number;           // 0..500
  percentil: number;
  respondidas: number;
  total: number;
  duracionSeg: number;
  competencias: Array<{
    id, nombre,
    puntaje: number;               // 0..100
    nivel: 1|2|3|4;
  }>;
  comparacionGrupo: { promedio: number; mejor: number; histograma: number[] };
  recomendaciones: Array<{
    tipo: 'video'|'drill'|'pdf';
    titulo: string;
    refId: string;
    motivo: string;                // 'Razonamiento cuantitativo, nivel 2'
  }>;
}
```

### `GET /intentos/:id/reporte` — mismo payload, para volver a verlo.

---

# Laboratorios de código

### `GET /labs/:id`

```ts
{
  lab: {
    id, titulo, enunciado, lenguaje, puntos,
    mostrarConsola: boolean, permitirPegar: boolean
  };
  codigoStarter: string;
  archivos: Array<{ nombre, contenido, editable: boolean }>;
  casos: Array<{ id, nombre, asercion, puntos }>;   // SOLO los visible = true
  pistas: Array<{ orden, texto }>;                   // se revelan por interacción
  intentosRestantes: number;
  ultimoEnvio: { id, veredicto, puntosObtenidos, enviadoEn } | null;
}
```

`codigoSolucion` y `archivoPruebas` **nunca** viajan al estudiante.

### `POST /labs/:id/envios`

```ts
// request
{ codigo: string; archivos?: Array<{ nombre, contenido }> }
// 202
{ envioId: string; veredicto: 'en_cola' }
```

`429` si supera el límite de envíos por minuto. `409` si agotó los intentos.

El cliente se suscribe a Supabase Realtime en `lab_envios` filtrado por `id = envioId`
y actualiza la consola cuando cambia `veredicto`.

### `GET /lab-envios/:id`

```ts
{
  id, veredicto: 'en_cola'|'ejecutando'|'aceptado'|'fallo_pruebas'|'error_compilacion'|'timeout'|'error_runner';
  puntosObtenidos: number | null;
  salida: string;                  // truncada a 64 KB
  casos: Array<{
    casoId: string;
    nombre: string;                // 'oculto' si el caso no es visible
    paso: boolean;
    ms: number;
    mensaje: string | null;        // vacío para casos ocultos
  }>;
  evaluadoEn: string | null;
}
```

---

# Asignaciones y entregas

### `GET /asignaciones?cursoId=&periodoId=&estado=`

```ts
{
  data: Array<{
    id, tipo, categoria, titulo, puntos,
    abre, cierra,
    entrega: { estado, entregadaEn, archivos: number } | null;
    calificacion: { valor, publicada } | null;
  }>;
}
```

### `GET /asignaciones/:id`

Incluye adjuntos del docente y la rúbrica si `publicarRubrica = true`.

### `POST /storage/url-subida`

```ts
// request
{ asignacionId: string; nombre: string; mime: string; bytes: number }
// 200
{ url: string; path: string; expiraEn: string }
```

Valida: la asignación está abierta (o acepta tarde), el mime está permitido,
`bytes <= 200 MB`, y el estudiante pertenece a un grupo destino.

### `POST /asignaciones/:id/entregas`

Confirma la subida y dispara la verificación automática si aplica.

```ts
// request
{ archivos: Array<{ nombre, path, mime, bytes }>; comentario?: string }
// 201
{
  entregaId: string;
  estado: 'entregada' | 'tarde';
  verificacionEncolada: boolean;
}
```

### `GET /entregas/:id/verificacion`

Resultado del análisis de .xlsx / .docx / .pptx en servidor:

```ts
{
  estado: 'pendiente' | 'lista' | 'error';
  criterios: Array<{
    criterioId: string;
    nombre: string;                // 'Tabla dinámica correcta'
    cumple: boolean;
    detalle: string;               // 'La fila 6 devuelve #N/A: el código P-4501 no existe...'
    puntosSugeridos: number;
  }>;
}
```

Implementación: `exceljs` para .xlsx (fórmulas, rangos, tablas dinámicas, gráficos),
`mammoth` para .docx (estilos, jerarquía de títulos, TOC, citas),
lectura del OOXML para .pptx (conteo de diapositivas, notas del orador, plantilla).

---

# Autoría del docente

Todos requieren `@Roles('docente')` (o `'coordinacion'`).

## Banco de preguntas

### `POST /preguntas`

```ts
{
  competenciaId: string;
  contextoTitulo?: string;
  contexto?: string;
  enunciado: string;
  opciones: [string, string, string, string];
  clave: 0|1|2|3;
  retroalimentacion?: string;
  dificultad: 'baja'|'media'|'alta';
}
```

### `GET /preguntas?competenciaId=&dificultad=&q=&cursor=`

Devuelve `vecesUsada` y `tasaAcierto` (lo que muestra el panel "Traer del banco").

### `PUT /preguntas/:id` · `POST /preguntas/:id/duplicar` · `DELETE /preguntas/:id`

### `POST /preguntas/importar`

`multipart/form-data` con un `.csv`. Columnas esperadas:
`competencia,contexto_titulo,contexto,enunciado,opcion_a,opcion_b,opcion_c,opcion_d,clave,retroalimentacion,dificultad`

```ts
// 200
{ creadas: number; errores: Array<{ fila: number; motivo: string }> }
```

## Exámenes

### `POST /examenes`

```ts
{
  nombre: string;
  minutos: number;
  mezclarPreguntas: boolean;
  mezclarOpciones: boolean;
  mostrarClaveAlTerminar: boolean;
  cronometroVisible: boolean;
  permitirRetomar: boolean;
}
```

### `PUT /examenes/:id/preguntas`

```ts
{ preguntaIds: string[] }   // el orden del arreglo es el orden del cuadernillo
```

### `POST /examenes/:id/generar`

Arma el examen automáticamente desde el banco, según la distribución de competencias
de la pantalla de configuración:

```ts
{ distribucion: Array<{ competenciaId: string; cantidad: number; dificultad?: string }> }
// 200
{ preguntaIds: string[]; faltantes: Array<{ competenciaId, solicitadas, disponibles }> }
```

### `POST /examenes/:id/publicar`

```ts
{ grupoIds: string[]; abre: string; cierra: string }
```

### `GET /examenes/:id/resultados`

Estadística por pregunta: % de acierto, distractor más elegido, tiempo medio.
Es lo que alimenta la alerta "62% falló la pregunta de JOIN externo" del panel.

## Labs

### `POST /labs`

```ts
{
  cursoId?: string;
  titulo: string;
  enunciado: string;
  lenguaje: 'javascript'|'python'|'sql'|'html_css';
  puntos: number;
  intentosMax: number;
  codigoStarter: string;
  codigoSolucion: string;
  archivoPruebas: string;
  autocalificar: boolean;
  mostrarConsola: boolean;
  permitirPegar: boolean;
  bloquearAlSalir: boolean;
  antiplagio: boolean;
  casos: Array<{ nombre, asercion, puntos, visible }>;
  pistas: Array<{ texto }>;
}
```

### `POST /labs/:id/validar`

Corre los casos contra `codigoSolucion` del docente. Bloquea la publicación si algo falla:
un lab cuya propia solución no pasa las pruebas no debe llegar al estudiante.

```ts
// 200
{ todosPasan: boolean; casos: Array<{ casoId, nombre, paso, ms, mensaje }> }
```

### `POST /labs/:id/publicar` · `GET /labs/:id/envios?grupoId=`

## Notas

### `GET /notas/:grupoId?cursoId=&periodoId=`

Payload de la planilla completa. Una sola consulta, ~35 filas × 8 columnas.

```ts
{
  ponderaciones: Array<{ categoria: 'talleres'|'labs'|'simulacros'|'actitudinal'; peso: number }>;
  columnas: Array<{
    asignacionId: string;
    label: string;                 // 'T09', 'LAB12', 'SIM3'
    categoria: string;
    max: string;                   // '5.0', '20p', '500'
    tipo: tipo_asignacion;
  }>;
  filas: Array<{
    estudianteId: string;
    nombre: string;
    celdas: Array<{
      asignacionId: string;
      valor: number | null;        // null se renderiza como '—' en naranja
      por: 'auto'|'docente'|null;
      publicada: boolean;
    }>;
    definitiva: number | null;
  }>;
  promedios: Array<{ asignacionId: string; valor: number | null }>;
  definitivaGrupo: number | null;
  sinCalificar: number;            // el contador '48 entregas sin calificar'
}
```

### `PATCH /notas/calificaciones`

Autoguardado por lotes. El front acumula las celdas editadas y las manda cada ~800 ms.

```ts
// request
{
  cambios: Array<{
    asignacionId: string;
    estudianteId: string;
    valor: number | null;          // null borra la calificación
    retroalimentacion?: string;
  }>;
}
// 200
{
  aplicados: number;
  definitivas: Array<{ estudianteId: string; valor: number }>;   // recalculadas
  conflictos: Array<{ asignacionId, estudianteId, motivo }>;
}
```

Requiere `Idempotency-Key`. Rechaza cambios si el periodo ya cerró
(`periodos.cierre_de_notas < now()`) salvo rol `coordinacion`.

### `POST /notas/:grupoId/publicar`

```ts
{ cursoId: string; periodoId: string; asignacionIds?: string[] }  // vacío = todas
// 200
{ publicadas: number; notificados: number }
```

Marca `calificaciones.publicada = true`. Hasta ese momento el estudiante no ve nada
(lo garantiza la política RLS `calificacion_visible`).

### `GET /notas/:grupoId/export.xlsx`

Genera el archivo con `exceljs`. Formato acordado con la secretaría académica.

## Publicar contenido

### `POST /asignaciones`

```ts
{
  cursoId: string;
  periodoId: string;
  tipo: 'taller'|'actividad'|'laboratorio'|'video'|'lectura'|'examen';
  categoria: 'talleres'|'labs'|'simulacros'|'actitudinal';
  titulo: string;
  instrucciones: string;
  puntos: number;
  abre: string;
  cierra: string;
  grupoIds: string[];
  aceptarTarde: boolean;
  penalizacionTarde: number;       // % descontado
  notificarPorCorreo: boolean;
  entregaEnGrupo: boolean;
  publicarRubrica: boolean;
  labId?: string;
  examenId?: string;
  rubrica?: Array<{ nombre: string; puntos: number }>;
  adjuntos?: Array<{ nombre, path, mime, bytes }>;
}
```

### `POST /storage/url-subida-material` — URL firmada para los adjuntos del docente.

### `POST /asignaciones/:id/publicar`

Encola las notificaciones si `notificarPorCorreo`.

## Analítica

### `GET /analitica/:grupoId?cursoId=&periodoId=`

```ts
{
  kpis: {
    estudiantes: number;
    entregasHoy: { hechas: number; total: number };
    promedioIcfes: number;
    enRiesgo: number;              // definitiva < 3.0 o inactividad > 7 días
    porCalificar: number;
  };
  dominio: {
    habilidades: string[];         // ['HTML','CSS','JS','React','SQL','Excel']
    filas: Array<{
      estudianteId: string;
      nombre: string;
      niveles: (0|1|2|3)[];        // 0 sin iniciar · 1 requiere apoyo · 2 en progreso · 3 dominado
      promedio: number;
    }>;
  };
  alertas: Array<{
    severidad: 'alta'|'media'|'info';
    sujeto: string;                // 'Juan D. Cuesta' o 'Grupo completo'
    mensaje: string;
    accion: { tipo: string; refId: string } | null;
  }>;
  distribucion: Array<{ rango: string; cantidad: number }>;
  bancoPreguntas: Array<{ competencia: string; total: number }>;
}
```

---

# Jobs (pg-boss)

| Cola | Disparador | Trabajo |
|---|---|---|
| `lab.calificar` | `POST /labs/:id/envios` | Empaqueta y manda a Judge0, escribe veredicto, inserta calificación si `autocalificar` |
| `entrega.verificar` | `POST /asignaciones/:id/entregas` | Abre .xlsx/.docx/.pptx y evalúa la rúbrica |
| `video.transcodificar` | subida de video del docente | Crea el asset en Mux, guarda `videoAssetId` |
| `notificacion.enviar` | publicación de asignación o de notas | Correo a estudiantes y acudientes |
| `estadistica.preguntas` | diario | Recalcula `vecesUsada` y `tasaAcierto` |
| `gamificacion.evaluar` | diario y al cerrar un lab | Rachas, XP, insignias |
| `intento.expirar` | cada minuto | Cierra intentos cuyo tiempo terminó y no se finalizaron |

`intento.expirar` es indispensable: si el estudiante cierra el navegador a mitad del
simulacro, el intento no puede quedar abierto para siempre.

---

# Variables de entorno

```
# apps/web
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=

# apps/api
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=                 # conexión directa para pg-boss y migraciones
JUDGE0_URL=
JUDGE0_TOKEN=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
SMTP_URL=
DOMINIO_INSTITUCIONAL=colegio.edu.co
```

`SUPABASE_SERVICE_ROLE_KEY` solo en el servidor de Nest. Nunca en el bundle de Next.
