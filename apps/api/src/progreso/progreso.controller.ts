import { Body, Controller, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import type { RequestUser } from '@aulawm/shared';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ProgresoService } from './progreso.service.js';
import { MarcarProgresoDto } from './dto/marcar-progreso.dto.js';

@Controller()
export class ProgresoController {
  constructor(private readonly progreso: ProgresoService) {}

  @Put('clases/:id/progreso')
  marcar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MarcarProgresoDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.progreso.marcarProgreso(
      id,
      user,
      body.completada,
      body.segundoAlcanzado,
    );
  }
}
