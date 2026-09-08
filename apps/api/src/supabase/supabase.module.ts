import { Module } from '@nestjs/common';
import { SupabaseAdminService } from './supabase-admin.service.js';

@Module({
  providers: [SupabaseAdminService],
  exports: [SupabaseAdminService],
})
export class SupabaseModule {}
