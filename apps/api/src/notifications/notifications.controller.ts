import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getUserNotifications(userId);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
