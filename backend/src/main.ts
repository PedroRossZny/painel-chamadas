import 'dotenv/config';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { AppModule } from './app.module';
import { allowedOrigins } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // The menu and the panel run on another port, so the browser needs CORS.
  // The event stream sets its own header (see AudioController.stream).
  await app.register(fastifyCors, {
    origin: allowedOrigins(),
    credentials: true,
  });

  // Generated announcements are served from /audios/<uuid>.mp3.
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'audios'),
    prefix: '/audios/',
  });

  app.enableShutdownHooks();

  await app.listen(
    Number(process.env.PORT ?? 3001),
    process.env.HOST ?? '0.0.0.0',
  );
}

void bootstrap();
