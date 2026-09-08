import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EntregarDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comentario?: string;
}
