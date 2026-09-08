import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class MarcarProgresoDto {
  @IsBoolean()
  completada!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  segundoAlcanzado?: number;
}
