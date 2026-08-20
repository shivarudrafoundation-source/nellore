import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { RegistrationsService } from './registrations.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin/registrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('eventId') eventId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('paymentStatus') paymentStatus?: 'PAID' | 'UNPAID',
  ) {
    return this.registrationsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      eventId,
      categoryId,
      paymentStatus,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.registrationsService.findOne(id);
  }

  @Post(':id/verify-payment')
  async verifyPayment(
    @Param('id') id: string,
    @Body() body: { contestantId?: string },
    @Req() req: any,
  ) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.registrationsService.verifyPaymentAndAssignContestant(id, body, user.sub, ip);
  }

  @Post(':id/create-contestant')
  async createContestant(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.registrationsService.createContestant(id, user.sub, ip);
  }

  @Patch(':id')
  async updateStatus(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.registrationsService.updateStatus(id, body as any, user.sub, ip);
  }
}
