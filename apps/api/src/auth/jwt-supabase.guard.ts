import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { RequestUserSchema, type RequestUser } from "@aulawm/shared";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
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
 * Verification is JWKS-based (asymmetric ECC/P-256), not a shared HS256
 * secret: new Supabase projects default to "JWT Signing Keys" rather than
 * the legacy shared JWT secret (confirmed against the real `aulawm` project
 * — Settings > JWT Keys shows an ECC (P-256) signing key, and the legacy
 * secret tab is explicitly deprecated: "Legacy JWT secret has been migrated
 * to new JWT Signing Keys"). `jose`'s `createRemoteJWKSet` fetches and caches
 * the public JWKS from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` — no
 * shared secret needs to be stored or protected on the API side at all.
 * See docs/adr/0009-supabase-auth.md.
 *
 * Roles and taught/enrolled groups are embedded in the token by the
 * `custom_access_token_hook` Postgres function (see
 * supabase/migrations/20260101000001_custom_access_token_hook.sql, and its
 * registration under Authentication > Hooks in the dashboard) under
 * `app_metadata.roles` / `app_metadata.grupos` — mirroring the `auth_roles()`
 * SQL function used by RLS policies, so both read the same claims.
 */
@Injectable()
export class JwtSupabaseGuard implements CanActivate {
  private jwks: JWTVerifyGetKey | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  private getJwks(): JWTVerifyGetKey {
    if (!this.jwks) {
      const supabaseUrl = this.config.getOrThrow<string>("SUPABASE_URL");
      this.jwks = createRemoteJWKSet(
        new URL("/auth/v1/.well-known/jwks.json", supabaseUrl),
      );
    }
    return this.jwks;
  }

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

    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(token, this.getJwks());
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
