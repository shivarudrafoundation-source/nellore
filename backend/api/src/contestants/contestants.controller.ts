import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ContestantsService } from './contestants.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin/contestants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ContestantsController {
  constructor(private readonly contestantsService: ContestantsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('eventId') eventId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.contestantsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      eventId,
      categoryId,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contestantsService.findOne(id);
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.contestantsService.createContestant(body, user.sub, ip);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.contestantsService.deleteContestant(id, user.sub, ip);
  }
}

