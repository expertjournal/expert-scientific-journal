import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = frontendOrigin.split(',').map((o) => o.trim());

  const isDevExplicit = process.env.NODE_ENV === 'development';

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin, allowed origin, or explicit development mode
      if (!origin || allowedOrigins.includes(origin) || isDevExplicit) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  });

  // OWASP Enterprise Security Response Headers Middleware
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");
    next();
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  logger.log(`Enterprise Backend API running on port ${port} (/api)`);
}

bootstrap();
