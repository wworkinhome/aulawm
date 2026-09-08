import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { RequestUser } from '@aulawm/shared';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ExamenesService } from './examenes.service.js';
import { GuardarRespuestasDto } from './dto/guardar-respuestas.dto.js';

@Controller()
export class ExamenesController {
  constructor(private readonly examenes: ExamenesService) {}

  @Get('examenes/:id/intento')
  intento(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examenes.obtenerOCrearIntento(id, user);
  }

  @Patch('intentos/:id/respuestas')
  guardarRespuestas(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GuardarRespuestasDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examenes.guardarRespuestas(id, user, body.respuestas);
  }

  @Post('intentos/:id/finalizar')
  finalizar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examenes.finalizar(id, user);
  }

  @Get('intentos/:id/reporte')
  reporte(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.examenes.obtenerReporte(id, user);
  }
}
