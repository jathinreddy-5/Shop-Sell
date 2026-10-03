import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// Ensure root .env variables are available to early constructors like DatabaseService
for (const envFile of ['.env', '../../.env', '../.env']) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust first proxy (e.g. Nginx, Cloudflare) so secure cookies & client IP work behind HTTPS
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');

  // Structured JSON logging for cloud observability (Railway / Render / CloudWatch)
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logEntry = {
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(logEntry));
      } else {
        console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Fallback: CORS enabled only in development, restricted to http://localhost:3008 with credentials
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: 'http://localhost:3008',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-anonymous-id'],
    });
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[Shop:Sell API] Backend running on http://localhost:${port}/api`);
}

bootstrap();
