import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    eventId?: string;
    status?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.eventId) where.eventId = query.eventId;
    if (query.status && ['ACTIVE', 'INACTIVE'].includes(query.status)) {
      where.status = query.status as any;
    }

    const [data, total] = await Promise.all([
      this.db.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          status: true,
          eventId: true,
          event: { select: { id: true, name: true, code: true } },
          createdAt: true,
          _count: { select: { rounds: true, registrations: true } },
        },
      }),
      this.db.category.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const category = await this.db.category.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true, code: true } },
        rounds: {
          select: { id: true, name: true, maxMarks: true, day: true, sortOrder: true, status: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { rounds: true, registrations: true, judges: true } },
      },
    });
    if (!category) throw new NotFoundException('Category not found.');
    return category;
  }

  async create(data: {
    eventId: string;
    name: string;
    code: string;
    description?: string;
    status?: string;
  }, actorId: string, ipAddress?: string) {
    if (!data.eventId) throw new BadRequestException('Event ID is required.');
    if (!data.name?.trim()) throw new BadRequestException('Category name is required.');
    if (!data.code?.trim()) throw new BadRequestException('Category code is required.');

    // Verify event exists
    const event = await this.db.event.findUnique({ where: { id: data.eventId }, select: { id: true } });
    if (!event) throw new BadRequestException('Event not found.');

    // Validate status
    const status = data.status || 'ACTIVE';
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestException('Invalid status. Must be ACTIVE or INACTIVE.');
    }

    // Check unique code within event
    const existing = await this.db.category.findUnique({
      where: { eventId_code: { eventId: data.eventId, code: data.code.trim().toUpperCase() } },
    });
    if (existing) {
      throw new ConflictException('A category with this code already exists in this event.');
    }

    const category = await this.db.category.create({
      data: {
        eventId: data.eventId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || null,
        status: status as any,
      },
    });

    await this.audit.log({
      actorType: 'ADMIN', actorId, action: 'CATEGORY_CREATED', entity: 'Category',
      entityId: category.id, after: { name: category.name, code: category.code, eventId: data.eventId }, ipAddress,
    });

    return category;
  }

  async update(id: string, data: {
    name?: string;
    code?: string;
    description?: string;
    status?: string;
  }, actorId: string, ipAddress?: string) {
    const existing = await this.db.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found.');

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name?.trim()) throw new BadRequestException('Category name cannot be empty.');
      updateData.name = data.name.trim();
    }

    if (data.code !== undefined) {
      if (!data.code?.trim()) throw new BadRequestException('Category code cannot be empty.');
      const codeUpper = data.code.trim().toUpperCase();
      if (codeUpper !== existing.code) {
        const dup = await this.db.category.findUnique({
          where: { eventId_code: { eventId: existing.eventId, code: codeUpper } },
        });
        if (dup) throw new ConflictException('A category with this code already exists in this event.');
      }
      updateData.code = codeUpper;
    }

    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(data.status)) {
        throw new BadRequestException('Invalid status. Must be ACTIVE or INACTIVE.');
      }
      updateData.status = data.status;
    }

    const updated = await this.db.category.update({ where: { id }, data: updateData });

    await this.audit.log({
      actorType: 'ADMIN', actorId, action: 'CATEGORY_UPDATED', entity: 'Category',
      entityId: id,
      before: { name: existing.name, code: existing.code, status: existing.status },
      after: { name: updated.name, code: updated.code, status: updated.status },
      ipAddress,
    });

    return updated;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const category = await this.db.category.findUnique({
      where: { id },
      include: { _count: { select: { rounds: true, registrations: true, judges: true } } },
    });
    if (!category) throw new NotFoundException('Category not found.');

    if (category._count.rounds > 0 || category._count.registrations > 0 || category._count.judges > 0) {
      throw new BadRequestException(
        'Cannot delete a category that contains associated data. Remove all rounds, registrations, and judges first.',
      );
    }

    await this.db.category.delete({ where: { id } });

    await this.audit.log({
      actorType: 'ADMIN', actorId, action: 'CATEGORY_DELETED', entity: 'Category',
      entityId: id, before: { name: category.name, code: category.code }, ipAddress,
    });

    return { message: 'Category deleted successfully.' };
  }
}
