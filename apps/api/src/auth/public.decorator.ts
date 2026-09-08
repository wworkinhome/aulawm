import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a route as exempt from JwtSupabaseGuard. Every other route requires
 * a valid Supabase-issued JWT — see docs/adr/0009-supabase-auth.md.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
