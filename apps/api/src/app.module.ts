import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersController } from './users/users.controller';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { ArticlesController } from './articles/articles.controller';
import { ArticlesService } from './articles/articles.service';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { IssuesController } from './issues/issues.controller';
import { IssuesService } from './issues/issues.service';
import { LocalStorageService } from './storage/local-storage.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

import { WorkflowModule } from './modules/workflow/workflow.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SearchModule } from './modules/search/search.module';

import { MailModule } from './mail/mail.module';
import { PublishingModule } from './modules/publishing/publishing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 900000, // 15 minutes in milliseconds
        limit: 5,     // 5 requests per 15 mins
      },
    ]),
    MailModule,
    WorkflowModule,
    ReviewsModule,
    SearchModule,
    PublishingModule,
  ],
  controllers: [
    PlatformController,
    AuthController,
    UsersController,
    JournalController,
    ArticlesController,
    NotificationsController,
    IssuesController,
  ],
  providers: [
    PrismaService,
    PlatformService,
    AuthService,
    JournalService,
    ArticlesService,
    NotificationsService,
    IssuesService,
    LocalStorageService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}