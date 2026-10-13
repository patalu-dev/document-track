import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    } : false, // Disable CSP in development for convenience
  }));
  
  app.use(cookieParser());

  // Tin proxy (nginx/LB) để Secure cookie + throttle IP đúng khi deploy sau proxy.
  // Chỉ bật khi TRUST_PROXY=true; mặc định KHÔNG tin X-Forwarded-For để
  // attacker không giả IP bypass rate limit (brute force login).
  if (process.env.TRUST_PROXY === 'true') {
    (app.getHttpAdapter().getInstance() as any)?.set?.('trust proxy', 1);
  }
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  
  // Configure CORS based on environment
  const corsOrigins = process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
    : ['http://localhost:5173', 'http://localhost:5174'];

  if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
    console.warn('WARNING: CORS_ORIGINS not set in production. No origins will be allowed.');
  }

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization',
  });
  
  // Bind to specific IP in production, localhost in development
  const host = process.env.NODE_ENV === 'production' 
    ? (process.env.HOST || '127.0.0.1')  // Production: bind to specific IP or localhost
    : '0.0.0.0';  // Development: bind to all interfaces for convenience
  
  await app.listen(process.env.PORT || 3000, host);
}
bootstrap();
