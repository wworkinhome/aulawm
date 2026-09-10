import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { RequestUser } from '@aulawm/shared';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { AsignacionesService } from './asignaciones.service.js';
import { CrearAsignacionDto } from './dto/crear-asignacion.dto.js';
import { EntregarDto } from './dto/entregar.dto.js';
import { CalificarDto } from './dto/calificar.dto.js';

@Controller()
export class AsignacionesController {
  constructor(private readonly asignaciones: AsignacionesService) {}

  @Roles('docente', 'coordinacion')
  @Post('cursos/:cursoId/asignaciones')
  crear(
    @Param('cursoId', ParseUUIDPipe) cursoId: string,
    @Body() dto: CrearAsignacionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.asignaciones.crear(cursoId, user, dto);
  }

  @Post('asignaciones/:id/entregas')
  entregar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EntregarDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.asignaciones.entregar(id, user, dto.comentario);
  }

  @Roles('docente', 'coordinacion')
  @Get('asignaciones/:id/entregas')
  listarEntregas(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.asignaciones.listarEntregas(id, user);
  }

  @Post('asignaciones/:id/entregas/archivo')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 15 * 1024 * 1024 } }))
  subirArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    if (!archivo) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.asignaciones.subirArchivo(id, user, archivo);
  }

  @Get('asignaciones/:id/mis-archivos')
  misArchivos(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.asignaciones.misArchivos(id, user);
  }

  @Get('entrega-archivos/:id/url')
  obtenerUrlArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.asignaciones.obtenerUrlArchivo(id, user);
  }

  @Roles('docente', 'coordinacion')
  @Put('entregas/:id/calificar')
  calificar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalificarDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.asignaciones.calificar(id, user, dto.valor, dto.retroalimentacion);
  }
}
