import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { RequestUserSchema, type RequestUser } from "@aulawm/shared";
import { jwtVerify } from "jose";
import type { Request } from "express";

import { IS_PUBLIC_KEY } from "./public.decorator.js";

declare module "express" {
  interface Request {
    user?: RequestUser;
  }
}

/**
 * Verifies the Supabase-issued JWT on every request (unless the route is
 * marked @Public()) and populates req.user = { sub, roles, grupos }.
 *
 * Per docs/adr/0009-supabase-auth.md, roles and taught/enrolled groups are
 * embedded in the token by a Supabase custom access token hook under
 * `app_metadata`, mirroring the `auth_roles()` SQL function in
 * supabase/migrations/20260101000000_initial_schema.sql (which reads
 * `auth.jwt() -> 'app_metadata' -> 'roles'`). The exact claim path below
 * (`app_metadata.roles` / `app_metadata.grupos`) must be confirmed against
 * the real hook once it's implemented against a live Supabase project — if
 * the hook places `grupos` elsewhere, update the payload mapping here, not
 * the RequestUser shape consumers depend on.
 */
@Injectable()
export class JwtSupabaseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const secret = this.config.getOrThrow<string>("SUPABASE_JWT_SECRET");
    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(token, new TextEncoder().encode(secret));
      payload = result.payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const appMetadata = (payload.app_metadata ?? {}) as {
      roles?: unknown;
      grupos?: unknown;
    };

    const candidate = {
      sub: payload.sub,
      roles: appMetadata.roles ?? [],
      grupos: appMetadata.grupos ?? [],
    };

    const parsed = RequestUserSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new UnauthorizedException("Token claims are missing or malformed");
    }

    request.user = parsed.data;
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}
