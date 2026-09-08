import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
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
