import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-execptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  })

  app.useGlobalFilters(new AllExceptionsFilter()) // 返回报错，走这个
  app.useGlobalInterceptors(new TransformInterceptor()) // 返回成功，走这个

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
