import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseAdminService } from '../supabase/supabase-admin.service.js';
import type { RequestUser } from '@aulawm/shared';

/**
 * progreso_clase has a permissive own-row RLS policy (estudiante_id =
 * auth.uid()), but RLS alone can't stop a student marking progress on a
 * clase_id from a course they were never enrolled in — per ADR-0008 that
 * ownership/business rule has to live here, not just in a direct write.
 */
@Injectable()
export class ProgresoService {
  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  private get db() {
    return this.supabaseAdmin.client;
  }

  private async assertInscrito(claseId: string, estudianteId: string) {
    const { data: clase } = await this.db
      .from('clases')
      .select('id, publicada, modulos(curso_id)')
      .eq('id', claseId)
      .maybeSingle<{
        id: string;
        publicada: boolean;
        modulos: { curso_id: string } | null;
      }>();

    if (!clase || !clase.publicada || !clase.modulos) {
      throw new NotFoundException('Clase no encontrada');
    }

    const { data: cursoGrupos } = await this.db
      .from('curso_grupos')
      .select('grupo_id')
      .eq('curso_id', clase.modulos.curso_id);

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

  async marcarProgreso(
    claseId: string,
    user: RequestUser,
    completada: boolean,
    segundoAlcanzado?: number,
  ) {
    await this.assertInscrito(claseId, user.sub);

    const { data, error } = await this.db
      .from('progreso_clase')
      .upsert(
        {
          clase_id: claseId,
          estudiante_id: user.sub,
          completada,
          segundo_alcanzado: segundoAlcanzado ?? 0,
          visto_en: new Date().toISOString(),
        },
        { onConflict: 'clase_id,estudiante_id' },
      )
      .select('clase_id, completada, segundo_alcanzado, visto_en')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
