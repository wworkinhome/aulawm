import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components/Actions — reads the
 * session from request cookies (Next.js 16 requires `cookies()` to be
 * awaited). `setAll` can throw when called from a Server Component that
 * isn't allowed to write cookies (no active response to attach to); that's
 * safe to ignore here because `proxy.ts` refreshes the session on every
 * request instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — proxy.ts handles the refresh.
          }
        },
      },
    },
  );
}
