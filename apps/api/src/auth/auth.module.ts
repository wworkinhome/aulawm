import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { JwtSupabaseGuard } from "./jwt-supabase.guard.js";
import { RolesGuard } from "./roles.guard.js";

/**
 * Registers JwtSupabaseGuard and RolesGuard as global guards, in that order:
 * authentication (who is this) runs before authorization (what can they do).
 * Mark a route @Public() to skip authentication entirely; mark it @Roles(...)
 * to additionally restrict it by role.
 */
@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtSupabaseGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
