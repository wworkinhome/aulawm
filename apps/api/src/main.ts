import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // SECURITY.md §2/§9: whitelist mode rejects unknown fields outright
  // (defends against mass assignment) rather than silently dropping them.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Explicit origin allow-list — SECURITY.md §9 forbids "*" for anything
  // reading/writing user data. CORS_ORIGINS is comma-separated in prod.
  const defaultOrigins = [
    'http://localhost:3000',
    'https://aulawm-web.vercel.app',
  ];
  const envOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: envOrigins ?? defaultOrigins,
    credentials: false,
  });

  // 3001, not Nest's default 3000 — apps/web (Next.js) already owns 3000.
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
