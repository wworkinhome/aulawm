import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseAdminService } from '../supabase/supabase-admin.service.js';
import type { RequestUser } from '@aulawm/shared';
import type { CrearAsignacionDto } from './dto/crear-asignacion.dto.js';

type Curso = { id: string; anio_id: string; docente_id: string };
type Asignacion = {
  id: string;
  curso_id: string;
  cierra: string;
  aceptar_tarde: boolean;
  publicada: boolean;
};

/**
 * Domain writes for tareas/talleres, per ADR-0008: creating, publishing,
 * submitting and grading all go through Nest. Reading an already-published
 * asignación or a student's own entrega/calificación stays a direct
 * Supabase read (RLS-scoped) — see the asignaciones_visibles/
 * entregas_propias/calificacion_visible policies.
 */
@Injectable()
export class AsignacionesService {
  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  private get db() {
    return this.supabaseAdmin.client;
  }

  private async resolverPeriodoActual(anioId: string): Promise<string> {
    const { data: periodos } = await this.db
      .from('periodos')
      .select('id, inicia, termina')
      .eq('anio_id', anioId)
      .order('numero', { ascending: false });

    const ahora = Date.now();
    const vigente = (periodos ?? []).find(
      (p) =>
        new Date(p.inicia).getTime() <= ahora &&
        ahora <= new Date(p.termina).getTime(),
    );
    const elegido = vigente ?? periodos?.[0];

    if (!elegido) {
      throw new ConflictException(
        'El curso no tiene ningún periodo académico configurado',
      );
    }
    return elegido.id;
  }

  private async assertDuenoDelCurso(cursoId: string, docenteId: string): Promise<Curso> {
    const { data: curso } = await this.db
      .from('cursos')
      .select('id, anio_id, docente_id')
      .eq('id', cursoId)
      .maybeSingle<Curso>();

    if (!curso) {
      throw new NotFoundException('Curso no encontrado');
    }
    if (curso.docente_id !== docenteId) {
      throw new ForbiddenException('No dictas este curso');
    }
    return curso;
  }

  async crear(cursoId: string, docente: RequestUser, dto: CrearAsignacionDto) {
    const curso = await this.assertDuenoDelCurso(cursoId, docente.sub);
    const periodoId = await this.resolverPeriodoActual(curso.anio_id);

    const { data, error } = await this.db
      .from('asignaciones')
      .insert({
        curso_id: cursoId,
        periodo_id: periodoId,
        autor_id: docente.sub,
        tipo: dto.tipo,
        categoria: dto.categoria,
        titulo: dto.titulo,
        instrucciones: dto.instrucciones ?? null,
        puntos: dto.puntos ?? 100,
        abre: dto.abre,
        cierra: dto.cierra,
        aceptar_tarde: dto.aceptarTarde ?? true,
        penalizacion_tarde: dto.penalizacionTarde ?? 20,
        publicada: dto.publicada ?? false,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  private async assertInscritoEnCurso(cursoId: string, estudianteId: string) {
    const { data: cursoGrupos } = await this.db
      .from('curso_grupos')
      .select('grupo_id')
      .eq('curso_id', cursoId);

    const grupoIds = (cursoGrupos ?? []).map((cg) => cg.grupo_id);
    if (grupoIds.length === 0) {
      throw new ForbiddenException('No estás inscrito en este curso');
    }

    const { data: matricula } = await this.db
      .from('matriculas')
      .select('grupo_id')
      .eq('estudiante_id', estudianteId)
      .eq('estado', 'activa')
      .in('grupo_id', grupoIds)
      .maybeSingle();

    if (!matricula) {
      throw new ForbiddenException('No estás inscrito en este curso');
    }
  }

  async entregar(asignacionId: string, estudiante: RequestUser, comentario?: string) {
    const { data: asignacion } = await this.db
      .from('asignaciones')
      .select('id, curso_id, cierra, aceptar_tarde, publicada')
      .eq('id', asignacionId)
      .maybeSingle<Asignacion>();

    if (!asignacion || !asignacion.publicada) {
      throw new NotFoundException('Actividad no encontrada');
    }

    await this.assertInscritoEnCurso(asignacion.curso_id, estudiante.sub);

    const tarde = Date.now() > new Date(asignacion.cierra).getTime();
    if (tarde && !asignacion.aceptar_tarde) {
      throw new ConflictException('La fecha de entrega ya cerró');
    }

    const { data, error } = await this.db
      .from('entregas')
      .upsert(
        {
          asignacion_id: asignacionId,
          estudiante_id: estudiante.sub,
          estado: tarde ? 'tarde' : 'entregada',
          comentario: comentario ?? null,
          entregada_en: new Date().toISOString(),
        },
        { onConflict: 'asignacion_id,estudiante_id' },
      )
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  private async obtenerAsignacionDelDocente(asignacionId: string, docenteId: string) {
    const { data: asignacion } = await this.db
      .from('asignaciones')
      .select('id, curso_id, cursos(docente_id)')
      .eq('id', asignacionId)
      .maybeSingle<{ id: string; curso_id: string; cursos: { docente_id: string } | null }>();

    if (!asignacion || asignacion.cursos?.docente_id !== docenteId) {
      throw new NotFoundException('Actividad no encontrada');
    }
    return asignacion;
  }

  async listarEntregas(asignacionId: string, docente: RequestUser) {
    await this.obtenerAsignacionDelDocente(asignacionId, docente.sub);

    const [{ data: entregas }, { data: calificaciones }] = await Promise.all([
      this.db
        .from('entregas')
        .select('id, estudiante_id, estado, comentario, entregada_en, perfiles!estudiante_id(nombres, apellidos)')
        .eq('asignacion_id', asignacionId),
      this.db
        .from('calificaciones')
        .select('estudiante_id, valor, retroalimentacion')
        .eq('asignacion_id', asignacionId),
    ]);

    const calificacionPorEstudiante = new Map(
      (calificaciones ?? []).map((c) => [c.estudiante_id, c]),
    );

    return (entregas ?? []).map((e) => {
      const perfil = e.perfiles as unknown as {
        nombres: string;
        apellidos: string;
      } | null;
      const calificacion = calificacionPorEstudiante.get(e.estudiante_id);
      return {
        entregaId: e.id,
        estudianteId: e.estudiante_id,
        nombre: perfil ? `${perfil.nombres} ${perfil.apellidos}` : 'Desconocido',
        estado: e.estado,
        comentario: e.comentario,
        entregadaEn: e.entregada_en,
        valor: calificacion?.valor ?? null,
        retroalimentacion: calificacion?.retroalimentacion ?? null,
      };
    });
  }

  async calificar(
    entregaId: string,
    docente: RequestUser,
    valor: number,
    retroalimentacion?: string,
  ) {
    const { data: entrega } = await this.db
      .from('entregas')
      .select('id, asignacion_id, estudiante_id')
      .eq('id', entregaId)
      .maybeSingle<{ id: string; asignacion_id: string; estudiante_id: string }>();

    if (!entrega) {
      throw new NotFoundException('Entrega no encontrada');
    }

    await this.obtenerAsignacionDelDocente(entrega.asignacion_id, docente.sub);

    const { error: errorCalif } = await this.db.from('calificaciones').upsert(
      {
        asignacion_id: entrega.asignacion_id,
        estudiante_id: entrega.estudiante_id,
        valor,
        retroalimentacion: retroalimentacion ?? null,
        por: 'docente',
        calificador_id: docente.sub,
        publicada: true,
        actualizada_en: new Date().toISOString(),
      },
      { onConflict: 'asignacion_id,estudiante_id' },
    );
    if (errorCalif) {
      throw errorCalif;
    }

    const { error: errorEntrega } = await this.db
      .from('entregas')
      .update({ estado: 'calificada' })
      .eq('id', entregaId);
    if (errorEntrega) {
      throw errorEntrega;
    }

    return { entregaId, valor, retroalimentacion: retroalimentacion ?? null };
  }
}
