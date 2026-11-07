import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { monitorEventLoopDelay } from 'node:perf_hooks';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const performanceLogger = new Logger('PerformanceMonitor');
  const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
  eventLoopDelay.enable();
  const performanceTimer = setInterval(() => {
    performanceLogger.log(
      `Event loop delay (ms): p95=${(eventLoopDelay.percentile(95) / 1e6).toFixed(2)}, ` +
        `mean=${(eventLoopDelay.mean / 1e6).toFixed(2)}, max=${(eventLoopDelay.max / 1e6).toFixed(2)}`,
    );
    eventLoopDelay.reset();
  }, 10000);
  performanceTimer.unref();
  app.enableCors();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Rally Telemetry API')
    .setDescription('Live vehicle telemetry and route history endpoints')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend server running on http://localhost:${process.env.PORT ?? 3000}`);
  app.enableShutdownHooks();
  app.getHttpServer().once('close', () => {
    clearInterval(performanceTimer);
    eventLoopDelay.disable();
  });
}
bootstrap();