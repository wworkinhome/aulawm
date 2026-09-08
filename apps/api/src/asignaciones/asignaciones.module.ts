import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AsignacionesController } from './asignaciones.controller.js';
import { AsignacionesService } from './asignaciones.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [AsignacionesController],
  providers: [AsignacionesService],
})
export class AsignacionesModule {}
