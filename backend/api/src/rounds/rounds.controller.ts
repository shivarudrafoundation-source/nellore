import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { RoundsService } from './rounds.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin/rounds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('eventId') eventId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ) {
    return this.roundsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search, eventId, categoryId, status,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roundsService.findOne(id);
  }

  @Post()
  async create(@Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.roundsService.create(body as any, user.sub, ip);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.roundsService.update(id, body as any, user.sub, ip);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.roundsService.remove(id, user.sub, ip);
  }

  @Post(':id/end')
  async endRound(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.roundsService.endRound(id, user.sub, ip);
  }

  @Get(':id/standings')
  async getStandings(@Param('id') id: string) {
    return this.roundsService.getRoundStandings(id);
  }
}
