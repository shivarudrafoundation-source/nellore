import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.eventsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      status,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post('upload-logo')
  async uploadLogo(@Body() body: any, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.eventsService.uploadLogo(body, user.sub, ip);
  }

  @Post()
  async create(@Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.eventsService.create(body as any, user.sub, ip);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.eventsService.update(id, body as any, user.sub, ip);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.eventsService.remove(id, user.sub, ip);
  }

  @Post(':id/end-final-round')
  async endFinalRound(
    @Param('id') id: string,
    @Body() body: { categoryId?: string; roundId?: string },
    @Req() req: any,
  ) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.eventsService.endFinalRound(id, user.sub, body, ip);
  }

  @Get(':id/final-results')
  async getFinalResults(
    @Param('id') id: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.eventsService.getFinalResults(id, categoryId);
  }
}
