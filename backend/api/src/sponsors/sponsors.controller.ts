import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SponsorsService } from './sponsors.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { CreateSponsorDto, UpdateSponsorDto } from './sponsors.types.js';

@Controller('admin/sponsors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SponsorsAdminController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Get()
  async findAll() {
    return this.sponsorsService.findAll(true);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sponsorsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateSponsorDto, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.sponsorsService.create(body, user.sub, ip);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateSponsorDto, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.sponsorsService.update(id, body, user.sub, ip);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.sponsorsService.delete(id, user.sub, ip);
  }
}

@Controller('public/sponsors')
export class SponsorsPublicController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Get()
  async getPublicSponsors() {
    return this.sponsorsService.findAll(false);
  }
}
