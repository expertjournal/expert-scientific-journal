import { Controller, Get, Param, Post, Body, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

class PromoteUserDto {
  @IsNotEmpty()
  @IsEnum(Role)
  role!: Role;
}

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.profile?.fullName || u.email.split('@')[0],
      authProvider: u.authProvider,
      googleId: u.googleId,
      role: u.role,
      isEmailVerified: u.isEmailVerified,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));
  }

  @Post(':id/promote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async promoteUser(@Param('id') id: string, @Body() body: PromoteUserDto) {
    if (body.role !== Role.EDITOR && body.role !== Role.ADMIN) {
      throw new BadRequestException('Role promotion must target EDITOR or ADMIN role');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: body.role },
      include: { profile: true },
    });

    return {
      success: true,
      message: `User ${updated.email} successfully promoted to ${updated.role}`,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
      },
    };
  }
}
