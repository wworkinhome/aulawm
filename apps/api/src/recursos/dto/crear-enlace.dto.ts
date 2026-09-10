import { IsIn, IsString, IsUrl, MinLength } from 'class-validator';

export class CrearEnlaceDto {
  @IsString()
  @MinLength(2)
  titulo!: string;

  @IsIn(['enlace', 'video'])
  tipo!: 'enlace' | 'video';

  @IsUrl({ protocols: ['https'], require_protocol: true })
  urlExterna!: string;
}
