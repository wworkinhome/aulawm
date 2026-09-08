import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { ExamenesModule } from './examenes/examenes.module.js';
import { ProgresoModule } from './progreso/progreso.module.js';
import { AsignacionesModule } from './asignaciones/asignaciones.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ExamenesModule,
    ProgresoModule,
    AsignacionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
