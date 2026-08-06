import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma.service';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, PrismaService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
