import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { ExamenesController } from './examenes.controller.js';
import { ExamenesService } from './examenes.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [ExamenesController],
  providers: [ExamenesService],
})
export class ExamenesModule {}
