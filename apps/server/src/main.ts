import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { corsOrigin } from './cors';

function httpsOptions() {
  const key = process.env.SSL_KEY ?? join(process.cwd(), 'certs/localhost-key.pem');
  const cert = process.env.SSL_CERT ?? join(process.cwd(), 'certs/localhost.pem');
  if (!existsSync(key) || !existsSync(cert)) return undefined;
  return { key: readFileSync(key), cert: readFileSync(cert) };
}

async function bootstrap() {
  const https = httpsOptions();
  const app = await NestFactory.create(AppModule, https ? { httpsOptions: https } : {});
  app.use(helmet());
  app.enableCors({ origin: corsOrigin });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Watchbear server ready: ${https ? 'https' : 'http'}://localhost:${port}`);
}

void bootstrap();
