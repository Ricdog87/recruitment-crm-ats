import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS for n8n integration
  app.enableCors({
    origin: process.env.N8N_WEBHOOK_URL || '*',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 Recruitment CRM/ATS System                              ║
║                                                               ║
║   ✅ Server running on: http://localhost:${port}                ║
║   📊 Prisma Studio: npm run prisma:studio                    ║
║   🤖 CLI Interface: npm run cli                              ║
║   🔗 n8n Integration: Ready                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
