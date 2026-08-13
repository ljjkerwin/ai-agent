import { Inject, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { AiModule } from './ai/ai.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'node:path'
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CronExpression } from '@nestjs/schedule';
import { JobModule } from './job/job.module';
import { Job } from './job/entities/job.entity';
import { Book } from './book/entities/book.entity';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public')
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('MYSQL_HOST'),
        username: configService.get<string>('MYSQL_USERNAME'),
        password: configService.get<string>('MYSQL_PASSWORD'),
        database: configService.get<string>('MYSQL_DATABASE'),
        synchronize: true,
        connectorPackage: 'mysql2',
        // logging: true,
        entities: [
          User,
          Job,
          Book,
        ]
      })
    }),
    BookModule,
    AiModule,
    ConfigModule.forRoot({
      isGlobal: true, // 把 ConfigModule 注册成全局模块， 之后其他 Module 里就不需要重复 imports: [ConfigModule]
      envFilePath: '.env'
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: Number(configService.get<string>('MAIL_PORT')),
          secure: configService.get<string>('MAIL_SECURE') === 'true',
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: configService.get<string>('MAIL_FROM'),
        },
      }),
    }),
    UsersModule,
    JobModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  @Inject(SchedulerRegistry)
  schedulerRegistry: SchedulerRegistry

  // async onApplicationBootstrap() {
  //   const job = new CronJob(CronExpression.EVERY_SECOND, () => {
  //     console.log(('run job'))
  //   })

  //   this.schedulerRegistry.addCronJob('job1', job)

  //   job.start()

  //   setTimeout(() => {
  //     this.schedulerRegistry.deleteCronJob('job1')
  //   }, 5000)

  //   const intercalRef = setInterval(() => {
  //     console.log('run interval job')
  //   }, 1000)

  //   this.schedulerRegistry.addInterval('interval1', intercalRef)

  //   setTimeout(() => {
  //     this.schedulerRegistry.deleteInterval('interval1')
  //   }, 7000)





  //   const timeoutRef = setTimeout(() => {
  //     console.log('run timeout')
  //   }, 3000)

  //   this.schedulerRegistry.addTimeout('timeout1', timeoutRef)

  //   setTimeout(() => {
  //     this.schedulerRegistry.deleteTimeout('timeout1')
  //   }, 2000)
  // }
}
