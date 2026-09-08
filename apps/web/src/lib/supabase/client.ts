import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client — uses the publishable (anon) key, scoped by
 * RLS. Only for the direct-read half of ADR-0008's hybrid model (e.g. "my
 * own profile"); every domain write still goes through the NestJS API.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
