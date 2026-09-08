import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseAdminService } from '../supabase/supabase-admin.service.js';
import type { RequestUser } from '@aulawm/shared';
import type { RespuestaDto } from './dto/guardar-respuestas.dto.js';

type Examen = {
  id: string;
  nombre: string;
  minutos: number;
  mezclar_preguntas: boolean;
  mezclar_opciones: boolean;
  mostrar_clave_al_terminar: boolean;
  cronometro_visible: boolean;
  permitir_retomar: boolean;
  publicado: boolean;
};

type Intento = {
  id: string;
  examen_id: string;
  estudiante_id: string;
  orden_preguntas: string[];
  inicio: string;
  fin: string | null;
  estado: 'en_curso' | 'finalizado' | 'anulado' | 'expirado';
  puntaje_global: number | null;
};

/**
 * Owns the one flow ADR-0008 explicitly says never goes through a direct
 * Supabase read: exam attempts. Server-side timing (never the client's
 * clock), the answer key never leaves this service, and every mutation
 * re-checks ownership — an intento's estudiante_id must match the caller,
 * not just "some valid intento id".
 */
@Injectable()
export class ExamenesService {
  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  private get db() {
    return this.supabaseAdmin.client;
  }

  private calcularRestante(intento: Pick<Intento, 'inicio'>, minutos: number) {
    const finProgramado = new Date(intento.inicio).getTime() + minutos * 60_000;
    return Math.max(0, Math.round((finProgramado - Date.now()) / 1000));
  }

  /** Confirms the exam is published, assigned to a group the student is
   * actively enrolled in, and currently open — never trusts "I know the
   * exam id" alone. */
  private async assertAsignado(
    examenId: string,
    estudianteId: string,
  ): Promise<Examen> {
    const { data: examen } = await this.db
      .from('examenes')
      .select(
        'id, nombre, minutos, mezclar_preguntas, mezclar_opciones, mostrar_clave_al_terminar, cronometro_visible, permitir_retomar, publicado',
      )
      .eq('id', examenId)
      .maybeSingle<Examen>();

    if (!examen || !examen.publicado) {
      throw new NotFoundException('Examen no encontrado');
    }

    const { data: asignaciones } = await this.db
      .from('examen_asignaciones')
      .select('grupo_id, abre, cierra')
      .eq('examen_id', examenId);

    const grupoIds = (asignaciones ?? []).map((a) => a.grupo_id as string);
    if (grupoIds.length === 0) {
      throw new ForbiddenException('Este examen no está publicado a ningún grupo');
    }

    const { data: matriculas } = await this.db
      .from('matriculas')
      .select('grupo_id')
      .eq('estudiante_id', estudianteId)
      .eq('estado', 'activa')
      .in('grupo_id', grupoIds);

    const misGrupos = new Set((matriculas ?? []).map((m) => m.grupo_id as string));
    const now = Date.now();
    const asignacionVigente = (asignaciones ?? []).find(
      (a) =>
        misGrupos.has(a.grupo_id as string) &&
        new Date(a.abre as string).getTime() <= now &&
        now <= new Date(a.cierra as string).getTime(),
    );

    if (!asignacionVigente) {
      throw new ForbiddenException('No tienes acceso a este examen ahora mismo');
    }

    return examen;
  }

  private shuffle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private async serializarIntento(intento: Intento, examen: Examen) {
    const { data: preguntas } = await this.db
      .from('preguntas')
      .select('id, enunciado, opciones, competencias(nombre)')
      .in('id', intento.orden_preguntas);

    const porId = new Map((preguntas ?? []).map((p) => [p.id as string, p]));

    const { data: respuestas } = await this.db
      .from('respuestas')
      .select('pregunta_id, opcion, marcada')
      .eq('intento_id', intento.id);

    return {
      intentoId: intento.id,
      examen: {
        nombre: examen.nombre,
        minutos: examen.minutos,
        cronometroVisible: examen.cronometro_visible,
      },
      restanteSeg: this.calcularRestante(intento, examen.minutos),
      // clave never included — this is the whole point of this endpoint.
      preguntas: intento.orden_preguntas.map((pid, i) => {
        const p = porId.get(pid);
        const competencia = p?.competencias as unknown as {
          nombre: string;
        } | null;
        return {
          id: pid,
          orden: i + 1,
          competencia: competencia?.nombre ?? null,
          enunciado: p?.enunciado ?? '',
          opciones: (p?.opciones as string[] | undefined) ?? [],
        };
      }),
      respuestas: (respuestas ?? []).map((r) => ({
        preguntaId: r.pregunta_id,
        opcion: r.opcion,
        marcada: r.marcada,
      })),
    };
  }

  async obtenerOCrearIntento(examenId: string, user: RequestUser) {
    const examen = await this.assertAsignado(examenId, user.sub);

    const { data: existente } = await this.db
      .from('intentos')
      .select('*')
      .eq('examen_id', examenId)
      .eq('estudiante_id', user.sub)
      .eq('estado', 'en_curso')
      .maybeSingle<Intento>();

    let intento = existente;

    if (intento && this.calcularRestante(intento, examen.minutos) <= 0) {
      await this.finalizarInterno(intento);
      intento = null;
    }

    if (!intento) {
      const { data: previos } = await this.db
        .from('intentos')
        .select('id')
        .eq('examen_id', examenId)
        .eq('estudiante_id', user.sub);

      if (previos && previos.length > 0 && !examen.permitir_retomar) {
        throw new ConflictException('Ya presentaste este examen');
      }

      const { data: preguntasExamen } = await this.db
        .from('examen_preguntas')
        .select('pregunta_id, orden')
        .eq('examen_id', examenId)
        .order('orden');

      let ordenPreguntas = (preguntasExamen ?? []).map(
        (p) => p.pregunta_id as string,
      );
      if (examen.mezclar_preguntas) {
        ordenPreguntas = this.shuffle(ordenPreguntas);
      }

      const { data: nuevo, error } = await this.db
        .from('intentos')
        .insert({
          examen_id: examenId,
          estudiante_id: user.sub,
          orden_preguntas: ordenPreguntas,
        })
        .select('*')
        .single<Intento>();

      if (error || !nuevo) {
        throw new Error(`No se pudo crear el intento: ${error?.message}`);
      }
      intento = nuevo;
    }

    return this.serializarIntento(intento, examen);
  }

  private async obtenerIntentoPropio(intentoId: string, user: RequestUser) {
    const { data: intento } = await this.db
      .from('intentos')
      .select('*')
      .eq('id', intentoId)
      .maybeSingle<Intento>();

    if (!intento || intento.estudiante_id !== user.sub) {
      throw new NotFoundException('Intento no encontrado');
    }
    return intento;
  }

  async guardarRespuestas(
    intentoId: string,
    user: RequestUser,
    respuestas: RespuestaDto[],
  ) {
    const intento = await this.obtenerIntentoPropio(intentoId, user);
    if (intento.estado !== 'en_curso') {
      throw new ConflictException('El intento ya cerró');
    }

    const { data: examen } = await this.db
      .from('examenes')
      .select('minutos')
      .eq('id', intento.examen_id)
      .single<{ minutos: number }>();

    const restanteSeg = this.calcularRestante(intento, examen!.minutos);
    if (restanteSeg <= 0) {
      await this.finalizarInterno(intento);
      throw new ConflictException('El tiempo del intento ya terminó');
    }

    for (const r of respuestas) {
      await this.db.from('respuestas').upsert(
        {
          intento_id: intentoId,
          pregunta_id: r.preguntaId,
          opcion: r.opcion,
          marcada: r.marcada ?? false,
          segundos_empleados: r.segundosEmpleados,
        },
        { onConflict: 'intento_id,pregunta_id' },
      );
    }

    return { guardadas: respuestas.length, restanteSeg };
  }

  private async finalizarInterno(intento: Intento) {
    const { data: respuestas } = await this.db
      .from('respuestas')
      .select('pregunta_id, opcion')
      .eq('intento_id', intento.id);

    const { data: preguntas } = await this.db
      .from('preguntas')
      .select('id, competencia_id, clave')
      .in('id', intento.orden_preguntas);

    const preguntaPorId = new Map(
      (preguntas ?? []).map((p) => [
        p.id as string,
        { competenciaId: p.competencia_id as string, clave: p.clave as number },
      ]),
    );
    const respuestaPorPregunta = new Map(
      (respuestas ?? []).map((r) => [
        r.pregunta_id as string,
        r.opcion as number | null,
      ]),
    );

    let correctas = 0;
    const porCompetencia = new Map<string, { correctas: number; total: number }>();

    for (const pid of intento.orden_preguntas) {
      const p = preguntaPorId.get(pid);
      if (!p) continue;
      const stat = porCompetencia.get(p.competenciaId) ?? {
        correctas: 0,
        total: 0,
      };
      stat.total += 1;
      const opcionDada = respuestaPorPregunta.get(pid);
      if (opcionDada !== undefined && opcionDada === p.clave) {
        correctas += 1;
        stat.correctas += 1;
      }
      porCompetencia.set(p.competenciaId, stat);
    }

    const total = intento.orden_preguntas.length;
    const puntajeGlobal = total > 0 ? Math.round((correctas / total) * 500) : 0;

    for (const [competenciaId, stat] of porCompetencia) {
      const puntaje =
        stat.total > 0 ? Math.round((stat.correctas / stat.total) * 100) : 0;
      const nivel = puntaje < 25 ? 1 : puntaje < 50 ? 2 : puntaje < 75 ? 3 : 4;
      await this.db.from('resultados_competencia').upsert(
        { intento_id: intento.id, competencia_id: competenciaId, puntaje, nivel },
        { onConflict: 'intento_id,competencia_id' },
      );
    }

    await this.db
      .from('intentos')
      .update({
        estado: 'finalizado',
        fin: new Date().toISOString(),
        puntaje_global: puntajeGlobal,
      })
      .eq('id', intento.id);
  }

  async finalizar(intentoId: string, user: RequestUser) {
    const intento = await this.obtenerIntentoPropio(intentoId, user);

    if (intento.estado === 'en_curso') {
      await this.finalizarInterno(intento);
    }

    return this.obtenerReporte(intentoId, user);
  }

  async obtenerReporte(intentoId: string, user: RequestUser) {
    const intento = await this.obtenerIntentoPropio(intentoId, user);

    const { data: resultados } = await this.db
      .from('resultados_competencia')
      .select('puntaje, nivel, competencias(nombre, sigla)')
      .eq('intento_id', intentoId);

    const { count: respondidas } = await this.db
      .from('respuestas')
      .select('pregunta_id', { count: 'exact', head: true })
      .eq('intento_id', intentoId)
      .not('opcion', 'is', null);

    return {
      estado: intento.estado,
      puntajeGlobal: intento.puntaje_global,
      respondidas: respondidas ?? 0,
      total: intento.orden_preguntas.length,
      competencias: (resultados ?? []).map((r) => {
        const c = r.competencias as unknown as {
          nombre: string;
          sigla: string;
        } | null;
        return {
          nombre: c?.nombre ?? '',
          sigla: c?.sigla ?? '',
          puntaje: r.puntaje,
          nivel: r.nivel,
        };
      }),
    };
  }
}
