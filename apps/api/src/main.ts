import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { createRouteHandler } from 'uploadthing/express';
import {
  resolveUploadthingToken,
  uploadRouter,
} from './uploadthing/upload-router';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MetricsService } from './monitor/metrics.service';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Ghi số liệu cho trang /monitor (đặt trước mọi route)
  app.use(app.get(MetricsService).middleware());
  app.enableShutdownHooks();

  app.enableCors();
  app.setGlobalPrefix('api', {
    // Trang chủ, privacy, terms cho Google OAuth nằm ở gốc domain
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: 'privacy', method: RequestMethod.GET },
      { path: 'terms', method: RequestMethod.GET },
      { path: 'monitor', method: RequestMethod.GET },
      { path: 'monitor/data', method: RequestMethod.GET },
    ],
  }); // /api/....
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const uploadthingToken = resolveUploadthingToken(
    process.env.UPLOADTHING_TOKEN,
  );
  process.env.UPLOADTHING_TOKEN = uploadthingToken;

  app.use(
    '/api/uploadthing',
    (req: Request, _res: Response, next: NextFunction) => {
      if (req.headers['content-type']?.startsWith('application/json')) {
        req.headers['content-type'] = 'application/json';
      }
      next();
    },
    createRouteHandler({
      router: uploadRouter,
      config: {
        token: uploadthingToken,
      },
    }),
  );

  const port = process.env.PORT ?? 3000;

  await app.listen(port);
  console.log(`API running on port ${port}`);
}
void bootstrap();
