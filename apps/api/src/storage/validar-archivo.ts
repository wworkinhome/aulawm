import { BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

export const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024;

// Sniffed via magic bytes (file-type), never the client-declared
// Content-Type — see ADR-0006. Formats file-type can't detect from bytes
// alone (csv, plain text) are allowed only by declared type as a narrow
// exception.
const MIME_CON_MAGIC_BYTES = new Set([
  'application/pdf',
  'application/zip',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const MIME_SIN_MAGIC_BYTES = new Set(['text/plain', 'text/csv']);

/** Confirms the actual file content (never the client-declared mimetype)
 * is one of the allowed types, per ADR-0006. Throws otherwise. */
export async function sniffearMimePermitido(
  buffer: Buffer,
  mimetypeDeclarado: string,
): Promise<string> {
  const detectado = await fileTypeFromBuffer(buffer);
  if (detectado && MIME_CON_MAGIC_BYTES.has(detectado.mime)) {
    return detectado.mime;
  }
  if (!detectado && MIME_SIN_MAGIC_BYTES.has(mimetypeDeclarado)) {
    return mimetypeDeclarado;
  }
  throw new BadRequestException(
    'Tipo de archivo no permitido (PDF, Word, Excel, PowerPoint, imagen, ZIP o texto plano)',
  );
}

export function assertTamanoPermitido(bytes: number) {
  if (bytes > TAMANO_MAXIMO_BYTES) {
    throw new BadRequestException('El archivo supera el límite de 15 MB');
  }
}
