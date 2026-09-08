import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The service-role Supabase client — bypasses RLS entirely (ADR-0008).
 * Every method that uses this MUST enforce ownership/authorization itself
 * in application code; RLS provides zero protection on this path.
 */
@Injectable()
export class SupabaseAdminService {
  readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SECRET_KEY'),
      { auth: { persistSession: false } },
    );
  }
}
