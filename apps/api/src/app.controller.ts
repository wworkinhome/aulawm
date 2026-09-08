import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { CurrentUser } from './auth/current-user.decorator.js';
import { Public } from './auth/public.decorator.js';
import { Roles } from './auth/roles.decorator.js';
import type { RequestUser } from '@aulawm/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Stub for `GET /me` from api/endpoints.md — proves the JwtSupabaseGuard
   * wiring end to end. Returns the token's own claims; `perfil` and
   * `matricula` need a real Supabase-backed query (packages/db), which lands
   * once the project scaffolds its data access layer against a real
   * Supabase instance.
   */
  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return { perfil: { id: user.sub }, roles: user.roles, matricula: null };
  }

  /**
   * Demonstrates RolesGuard: only 'docente'/'coordinacion' tokens pass.
   * Remove once a real teacher-only endpoint (e.g. POST /preguntas) replaces
   * it as the reference example.
   */
  @Roles('docente', 'coordinacion')
  @Get('_ejemplo-solo-docente')
  getEjemploDocente(@CurrentUser() user: RequestUser) {
    return { ok: true, sub: user.sub, roles: user.roles };
  }
}
