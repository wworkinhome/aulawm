import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { ProgresoController } from './progreso.controller.js';
import { ProgresoService } from './progreso.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [ProgresoController],
  providers: [ProgresoService],
})
export class ProgresoModule {}
