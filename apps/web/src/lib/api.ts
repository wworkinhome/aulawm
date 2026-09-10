import { createClient } from "@/lib/supabase/client";

/**
 * Client-side fetch to the NestJS API, attaching the current Supabase
 * session as a Bearer token — the same JWT JwtSupabaseGuard verifies via
 * JWKS (ADR-0009). Only for calls that must go through Nest (business
 * logic, ownership checks, anything ADR-0008 says isn't a plain direct
 * read).
 */
export async function apiFetch(path: string, init?: RequestInit) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // FormData (file uploads) must NOT get a Content-Type here — the browser
  // sets its own multipart boundary. Only default to JSON otherwise.
  const isFormData = init?.body instanceof FormData;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
  });

  return res;
}
