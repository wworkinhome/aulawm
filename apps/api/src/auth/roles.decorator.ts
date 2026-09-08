import { SetMetadata } from "@nestjs/common";
import type { RolUsuario } from "@aulawm/shared";

export const ROLES_KEY = "roles";

/**
 * Declares which roles may call this endpoint. Role alone is never
 * sufficient authorization for a resource-scoped endpoint — every
 * teacher-scoped write must additionally verify the resource belongs to a
 * group/course the caller teaches (see SECURITY_THREAT_MODEL.md "API" and
 * "Admin"). This decorator only gates by role.
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
