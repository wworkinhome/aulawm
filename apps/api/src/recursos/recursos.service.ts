import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseAdminService } from '../supabase/supabase-admin.service.js';
import { assertTamanoPermitido, sniffearMimePermitido } from '../storage/validar-archivo.js';
import type { RequestUser } from '@aulawm/shared';
import type { SubirRecursoDto } from './dto/subir-recurso.dto.js';
import type { CrearEnlaceDto } from './dto/crear-enlace.dto.js';

type ClaseConCurso = {
  id: string;
  modulos: { curso_id: string; cursos: { docente_id: string } | null } | null;
};

/**
 * Material de apoyo por clase. Creating always goes through Nest (file
 * content has to be sniffed before acceptance, per ADR-0006's exception to
 * the "direct pre-signed upload" pattern used for exam/course data).
 * Listing an already-created recurso stays a direct Supabase read against
 * the recursos_visibles RLS policy — this service only handles the two
 * writes (upload, link) and the signed-download read.
 */
@Injectable()
export class RecursosService {
  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  private get db() {
    return this.supabaseAdmin.client;
  }

  private async obtenerClaseDelDocente(
    claseId: string,
    docenteId: string,
  ): Promise<{ claseId: string; cursoId: string }> {
    const { data: clase } = await this.db
      .from('clases')
      .select('id, modulos(curso_id, cursos(docente_id))')
      .eq('id', claseId)
      .maybeSingle<ClaseConCurso>();

    if (!clase || !clase.modulos || clase.modulos.cursos?.docente_id !== docenteId) {
      throw new NotFoundException('Clase no encontrada');
    }
    return { claseId: clase.id, cursoId: clase.modulos.curso_id };
  }

  async subirArchivo(
    claseId: string,
    docente: RequestUser,
    dto: SubirRecursoDto,
    archivo: { buffer: Buffer; mimetype: string; size: number },
  ) {
    assertTamanoPermitido(archivo.size);
    const { cursoId } = await this.obtenerClaseDelDocente(claseId, docente.sub);
    const mimeReal = await sniffearMimePermitido(archivo.buffer, archivo.mimetype);

    // Path uses only a generated id, never the user-supplied filename —
    // ADR-0006, defends against path traversal via a crafted name.
    const storagePath = `${cursoId}/${claseId}/${randomUUID()}`;

    const { error: errorSubida } = await this.db.storage
      .from('material')
      .upload(storagePath, archivo.buffer, { contentType: mimeReal, upsert: false });
    if (errorSubida) {
      throw errorSubida;
    }

    const { data, error } = await this.db
      .from('recursos')
      .insert({
        curso_id: cursoId,
        clase_id: claseId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        storage_path: storagePath,
        bytes: archivo.size,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  async crearEnlace(claseId: string, docente: RequestUser, dto: CrearEnlaceDto) {
    const { cursoId } = await this.obtenerClaseDelDocente(claseId, docente.sub);

    const { data, error } = await this.db
      .from('recursos')
      .insert({
        curso_id: cursoId,
        clase_id: claseId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        url_externa: dto.urlExterna,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  async obtenerUrlArchivo(recursoId: string, user: RequestUser) {
    const { data: recurso } = await this.db
      .from('recursos')
      .select('storage_path, clase_id, clases(modulos(curso_id, cursos(docente_id)))')
      .eq('id', recursoId)
      .maybeSingle<{
        storage_path: string | null;
        clase_id: string | null;
        clases: { modulos: { curso_id: string; cursos: { docente_id: string } | null } | null } | null;
      }>();

    if (!recurso || !recurso.storage_path) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const cursoId = recurso.clases?.modulos?.curso_id;
    const esDocenteDelCurso = recurso.clases?.modulos?.cursos?.docente_id === user.sub;

    if (!esDocenteDelCurso) {
      if (!cursoId) {
        throw new NotFoundException('Archivo no encontrado');
      }
      const { data: cursoGrupos } = await this.db
        .from('curso_grupos')
        .select('grupo_id')
        .eq('curso_id', cursoId);
      const grupoIds = (cursoGrupos ?? []).map((cg) => cg.grupo_id);
      const { data: matricula } =
        grupoIds.length === 0
          ? { data: null }
          : await this.db
              .from('matriculas')
              .select('grupo_id')
              .eq('estudiante_id', user.sub)
              .eq('estado', 'activa')
              .in('grupo_id', grupoIds)
              .maybeSingle();
      if (!matricula) {
        throw new ForbiddenException('No tienes acceso a este archivo');
      }
    }

    const { data, error } = await this.db.storage
      .from('material')
      .createSignedUrl(recurso.storage_path, 60);

    if (error || !data) {
      throw error ?? new NotFoundException('No se pudo generar el enlace');
    }
    return { url: data.signedUrl };
  }
}
