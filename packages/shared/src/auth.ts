import { z } from "zod";

// Matches `rol_usuario` in supabase/migrations/20260101000000_initial_schema.sql
// and the roles embedded in the Supabase JWT by the custom access token hook
// (see docs/adr/0009-supabase-auth.md).
export const RolUsuarioSchema = z.enum(["estudiante", "docente", "coordinacion"]);
export type RolUsuario = z.infer<typeof RolUsuarioSchema>;

// Shape of `req.user` after `JwtSupabaseGuard` verifies the Supabase JWT —
// see api/endpoints.md "Autenticación". `grupos` holds the groups the user
// teaches (docente) or is actively enrolled in (estudiante).
export const RequestUserSchema = z.object({
  sub: z.string().uuid(),
  roles: z.array(RolUsuarioSchema),
  grupos: z.array(z.string().uuid()),
});
export type RequestUser = z.infer<typeof RequestUserSchema>;

export function esDocente(user: Pick<RequestUser, "roles">): boolean {
  return user.roles.includes("docente") || user.roles.includes("coordinacion");
}
