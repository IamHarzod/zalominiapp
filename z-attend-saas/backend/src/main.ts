import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Cho phép CORS cho Zalo Mini App & Web Dashboard
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // Tự động kiểm tra dữ liệu đầu vào (DTO Validation)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Z-Attend Backend Server is running on: http://localhost:${port}`);
  }

void bootstrap();
