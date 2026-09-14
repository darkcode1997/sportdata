import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import type { NextFunction, Request, Response } from 'express';
import { constants as zlibConstants } from 'zlib';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(compression({
    threshold: 1_024,
    brotli: { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 } },
  }));
  app.use((request: Request, response: Response, next: NextFunction) => {
    const publicGet = request.method === 'GET'
      && !request.headers.authorization
      && /^\/api\/(events|matches|athletes|sports|categories|countries|federations|statistics)(\/|\?|$)/
        .test(request.originalUrl);

    if (publicGet) {
      const isLiveData = request.originalUrl.startsWith('/api/matches');
      const maxAge = isLiveData ? 5 : 30;
      response.setHeader(
        'Cache-Control',
        `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      );
      response.vary('Accept-Encoding');
      response.vary('Authorization');
    }
    next();
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('SportData Platform API')
    .setDescription('API for managing sports events, athletes, matches, and statistics')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT || '4000', 10) || 4000;
  const net = await import('net');
  function portAvailable(p: number): Promise<number> {
    return new Promise((res) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => res(portAvailable(p + 1)));
      server.listen(p, () => server.close(() => res(p)));
    });
  }
  const listenPort = await portAvailable(port);
  await app.listen(listenPort);
  // A 2GB backup upload can legitimately take much longer than Node's default
  // request timeout on slower private networks.
  app.getHttpServer().requestTimeout = 2 * 60 * 60 * 1000;
  console.log(`\n🟢 BACKEND RUNNING on http://localhost:${listenPort}/api`);
  console.log(`📚 API Docs (Swagger): http://localhost:${listenPort}/api/docs\n`);
}
bootstrap();
