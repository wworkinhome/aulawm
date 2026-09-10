import { IsIn, MinLength, IsString } from 'class-validator';

const TIPOS_ARCHIVO = ['pdf', 'xlsx', 'docx', 'pptx', 'sql', 'repo', 'slides'] as const;

export class SubirRecursoDto {
  @IsString()
  @MinLength(2)
  titulo!: string;

  @IsIn(TIPOS_ARCHIVO)
  tipo!: (typeof TIPOS_ARCHIVO)[number];
}
