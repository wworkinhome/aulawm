import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  nombre: string;
  roles: string[];
};

/**
 * Server-only helper for route-group layouts: confirms a session exists and
 * fetches the user's own profile + roles via direct Supabase reads (RLS-
 * scoped to "my own row" — see ADR-0008). Redirects to /login if there's no
 * session at all; role-specific redirects (docente vs estudiante) are each
 * layout's own responsibility, not this helper's.
 */
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: perfil }, { data: rolesRows }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("nombres, apellidos")
      .eq("id", user.id)
      .single(),
    supabase.from("roles_usuario").select("rol").eq("usuario_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    nombre: perfil
      ? `${perfil.nombres} ${perfil.apellidos}`.trim()
      : (user.email ?? ""),
    roles: (rolesRows ?? []).map((r) => r.rol as string),
  };
}
