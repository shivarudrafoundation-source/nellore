import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JudgesService } from './judges.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin/judges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class JudgesController {
  constructor(private readonly judgesService: JudgesService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('eventId') eventId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('roundId') roundId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.judgesService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      eventId,
      categoryId,
      roundId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.judgesService.findOne(id);
  }

  @Post()
  async create(@Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.judgesService.create(body as any, user.sub, ip);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.judgesService.update(id, body as any, user.sub, ip);
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.judgesService.assign(id, body as any, user.sub, ip);
  }

  @Post(':id/assignments')
  async createAssignment(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.judgesService.assign(id, body as any, user.sub, ip);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.judgesService.resetPassword(id, body, user.sub, ip);
  }

  @Post(':id/disable')
  async disable(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.judgesService.disable(id, user.sub, ip);
  }

  @Post(':id/enable')
  async enable(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.judgesService.enable(id, user.sub, ip);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.judgesService.deleteJudge(id, user.sub, ip);
  }
}
