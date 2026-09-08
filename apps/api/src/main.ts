import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 3001, not Nest's default 3000 — apps/web (Next.js) already owns 3000.
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
