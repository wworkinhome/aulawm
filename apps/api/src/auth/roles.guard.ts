import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RolUsuario } from "@aulawm/shared";
import type { Request } from "express";

import { ROLES_KEY } from "./roles.decorator.js";

/**
 * Runs after JwtSupabaseGuard (which populates req.user). Denies by default:
 * an endpoint with no @Roles() metadata is only reachable by
 * JwtSupabaseGuard's authentication check, not by this guard — apply
 * @Roles(...) explicitly on every authoring/admin endpoint.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const userRoles = request.user?.roles ?? [];
    const authorized = requiredRoles.some((role) => userRoles.includes(role));

    if (!authorized) {
      throw new ForbiddenException(
        "Your role does not permit this operation",
      );
    }
    return true;
  }
}
