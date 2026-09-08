import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RespuestaDto {
  @IsUUID()
  preguntaId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  opcion!: number | null;

  @IsOptional()
  @IsBoolean()
  marcada?: boolean;

  @IsInt()
  @Min(0)
  segundosEmpleados!: number;
}

export class GuardarRespuestasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RespuestaDto)
  respuestas!: RespuestaDto[];
}
