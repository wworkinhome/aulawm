import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { RequestUser } from "@aulawm/shared";
import type { Request } from "express";

/** Injects the authenticated req.user populated by JwtSupabaseGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new Error(
        "CurrentUser used on a route without JwtSupabaseGuard — req.user is empty",
      );
    }
    return request.user;
  },
);
