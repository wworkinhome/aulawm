import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { RecursosController } from './recursos.controller.js';
import { RecursosService } from './recursos.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [RecursosController],
  providers: [RecursosService],
})
export class RecursosModule {}
