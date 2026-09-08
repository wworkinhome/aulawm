import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const TIPOS = ['taller', 'actividad', 'laboratorio', 'video', 'lectura', 'examen'] as const;
const CATEGORIAS = ['talleres', 'labs', 'simulacros', 'actitudinal'] as const;

export class CrearAsignacionDto {
  @IsIn(TIPOS)
  tipo!: (typeof TIPOS)[number];

  @IsIn(CATEGORIAS)
  categoria!: (typeof CATEGORIAS)[number];

  @IsString()
  @MinLength(3)
  titulo!: string;

  @IsOptional()
  @IsString()
  instrucciones?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  puntos?: number;

  @IsDateString()
  abre!: string;

  @IsDateString()
  cierra!: string;

  @IsOptional()
  @IsBoolean()
  aceptarTarde?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  penalizacionTarde?: number;

  @IsOptional()
  @IsBoolean()
  publicada?: boolean;
}
