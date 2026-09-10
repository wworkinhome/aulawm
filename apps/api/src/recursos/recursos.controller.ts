import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { RequestUser } from '@aulawm/shared';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RecursosService } from './recursos.service.js';
import { SubirRecursoDto } from './dto/subir-recurso.dto.js';
import { CrearEnlaceDto } from './dto/crear-enlace.dto.js';

@Controller()
export class RecursosController {
  constructor(private readonly recursos: RecursosService) {}

  @Roles('docente', 'coordinacion')
  @Post('clases/:id/recursos/archivo')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 15 * 1024 * 1024 } }))
  subirArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubirRecursoDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    if (!archivo) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.recursos.subirArchivo(id, user, dto, archivo);
  }

  @Roles('docente', 'coordinacion')
  @Post('clases/:id/recursos/enlace')
  crearEnlace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrearEnlaceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.recursos.crearEnlace(id, user, dto);
  }

  @Get('recursos/:id/url')
  obtenerUrlArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.recursos.obtenerUrlArchivo(id, user);
  }
}
