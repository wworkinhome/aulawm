import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CalificarDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5)
  valor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  retroalimentacion?: string;
}
