import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  private publicEventsCache: { data: any; expiresAt: number } | null = null;
  private slugCache = new Map<string, { data: any; expiresAt: number }>();

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  public invalidatePublicCache() {
    this.publicEventsCache = null;
    this.slugCache.clear();
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status && ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(query.status)) {
      where.status = query.status as any;
    }

    const orderBy: Prisma.EventOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'createdAt';
    const sortDir = query.sortOrder || 'desc';
    if (['name', 'code', 'startDate', 'endDate', 'status', 'createdAt'].includes(sortField)) {
      (orderBy as any)[sortField] = sortDir;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.db.event.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          code: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,
          logoUrl: true,
          createdAt: true,
          _count: {
            select: {
              categories: true,
              registrations: true,
            },
          },
        },
      }),
      this.db.event.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const event = await this.db.event.findUnique({
      where: { id },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            _count: { select: { rounds: true, registrations: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            registrations: true,
            contestants: true,
            judges: true,
            categories: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    return event;
  }

  async create(data: {
    name: string;
    code: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    logoUrl?: string;
    registrationOpenDate?: string;
    registrationCloseDate?: string;
    status?: string;
  }, actorId: string, ipAddress?: string) {
    // Validate required fields
    if (!data.name?.trim()) throw new BadRequestException('Event name is required.');
    if (!data.code?.trim()) throw new BadRequestException('Event code is required.');
    if (!data.description?.trim()) throw new BadRequestException('Description is required.');
    if (!data.location?.trim()) throw new BadRequestException('Location is required.');
    if (!data.startDate) throw new BadRequestException('Start date is required.');
    if (!data.endDate) throw new BadRequestException('End date is required.');

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (isNaN(startDate.getTime())) throw new BadRequestException('Invalid start date.');
    if (isNaN(endDate.getTime())) throw new BadRequestException('Invalid end date.');
    if (endDate <= startDate) throw new BadRequestException('End date must be after start date.');

    // Validate registration dates
    let regOpenDate: Date | null = null;
    let regCloseDate: Date | null = null;

    if (data.registrationOpenDate) {
      regOpenDate = new Date(data.registrationOpenDate);
      if (isNaN(regOpenDate.getTime())) throw new BadRequestException('Invalid registration open date.');
    }
    if (data.registrationCloseDate) {
      regCloseDate = new Date(data.registrationCloseDate);
      if (isNaN(regCloseDate.getTime())) throw new BadRequestException('Invalid registration close date.');
    }
    if (regOpenDate && regCloseDate && regOpenDate >= regCloseDate) {
      throw new BadRequestException('Registration open date must be before registration close date.');
    }

    // Validate status
    const validStatuses = ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    const status = data.status || 'DRAFT';
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Check unique code
    const existing = await this.db.event.findUnique({ where: { code: data.code.trim().toUpperCase() } });
    if (existing) {
      throw new ConflictException('An event with this code already exists.');
    }

    const event = await this.db.event.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description.trim(),
        location: data.location.trim(),
        startDate,
        endDate,
        logoUrl: data.logoUrl?.trim() || null,
        registrationOpenDate: regOpenDate,
        registrationCloseDate: regCloseDate,
        status: status as any,
      },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'EVENT_CREATED',
      entity: 'Event',
      entityId: event.id,
      after: { name: event.name, code: event.code, status: event.status },
      ipAddress,
    });

    this.invalidatePublicCache();
    return event;
  }

  async update(id: string, data: {
    name?: string;
    code?: string;
    description?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    logoUrl?: string;
    registrationOpenDate?: string | null;
    registrationCloseDate?: string | null;
    status?: string;
  }, actorId: string, ipAddress?: string) {
    const existing = await this.db.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found.');

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name?.trim()) throw new BadRequestException('Event name cannot be empty.');
      updateData.name = data.name.trim();
    }

    if (data.code !== undefined) {
      if (!data.code?.trim()) throw new BadRequestException('Event code cannot be empty.');
      const codeUpper = data.code.trim().toUpperCase();
      if (codeUpper !== existing.code) {
        const dup = await this.db.event.findUnique({ where: { code: codeUpper } });
        if (dup) throw new ConflictException('An event with this code already exists.');
      }
      updateData.code = codeUpper;
    }

    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.location !== undefined) updateData.location = data.location.trim();
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl?.trim() || null;

    // Date validations
    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;

    if (data.startDate) {
      if (isNaN(startDate.getTime())) throw new BadRequestException('Invalid start date.');
      updateData.startDate = startDate;
    }
    if (data.endDate) {
      if (isNaN(endDate.getTime())) throw new BadRequestException('Invalid end date.');
      updateData.endDate = endDate;
    }
    if (endDate <= startDate) throw new BadRequestException('End date must be after start date.');

    // Registration dates
    if (data.registrationOpenDate !== undefined) {
      updateData.registrationOpenDate = data.registrationOpenDate ? new Date(data.registrationOpenDate) : null;
    }
    if (data.registrationCloseDate !== undefined) {
      updateData.registrationCloseDate = data.registrationCloseDate ? new Date(data.registrationCloseDate) : null;
    }

    const regOpen = updateData.registrationOpenDate ?? existing.registrationOpenDate;
    const regClose = updateData.registrationCloseDate ?? existing.registrationCloseDate;
    if (regOpen && regClose && regOpen >= regClose) {
      throw new BadRequestException('Registration open date must be before registration close date.');
    }

    if (data.status !== undefined) {
      const validStatuses = ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(data.status)) {
        throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      updateData.status = data.status;
    }

    const updated = await this.db.event.update({ where: { id }, data: updateData });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'EVENT_UPDATED',
      entity: 'Event',
      entityId: id,
      before: { name: existing.name, code: existing.code, status: existing.status },
      after: { name: updated.name, code: updated.code, status: updated.status },
      ipAddress,
    });

    this.invalidatePublicCache();
    return updated;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const event = await this.db.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            categories: true,
            registrations: true,
            contestants: true,
            judges: true,
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found.');

    const deps = event._count;
    if (deps.categories > 0 || deps.registrations > 0 || deps.contestants > 0 || deps.judges > 0) {
      throw new BadRequestException(
        'Cannot delete an event that contains associated data. Remove all categories, registrations, contestants, and judges first.',
      );
    }

    await this.db.event.delete({ where: { id } });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'EVENT_DELETED',
      entity: 'Event',
      entityId: id,
      before: { name: event.name, code: event.code, status: event.status },
      ipAddress,
    });

    this.invalidatePublicCache();
    return { message: 'Event deleted successfully.' };
  }

  /**
   * Helper to calculate registration status based on server time
   */
  private calculateRegistrationStatus(event: {
    status: string;
    registrationOpenDate: Date | null;
    registrationCloseDate: Date | null;
  }) {
    if (event.status === 'CANCELLED') {
      return { registrationStatus: 'CANCELLED' as const, isRegistrationOpen: false };
    }

    const now = new Date();

    if (event.registrationOpenDate && now < new Date(event.registrationOpenDate)) {
      return { registrationStatus: 'NOT_YET_OPEN' as const, isRegistrationOpen: false };
    }

    if (event.registrationCloseDate && now > new Date(event.registrationCloseDate)) {
      return { registrationStatus: 'CLOSED' as const, isRegistrationOpen: false };
    }

    return { registrationStatus: 'OPEN' as const, isRegistrationOpen: true };
  }

  /**
   * Public Event List API: Only UPCOMING, ACTIVE, or COMPLETED events (no DRAFT or CANCELLED)
   */
  async getPublicEvents() {
    const now = Date.now();
    if (this.publicEventsCache && this.publicEventsCache.expiresAt > now) {
      return this.publicEventsCache.data;
    }

    const events = await this.db.event.findMany({
      where: {
        status: { in: ['UPCOMING', 'ACTIVE', 'COMPLETED'] },
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        location: true,
        startDate: true,
        endDate: true,
        logoUrl: true,
        description: true,
        registrationOpenDate: true,
        registrationCloseDate: true,
        status: true,
        categories: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    const result = events.map((ev) => {
      const regStatus = this.calculateRegistrationStatus(ev);
      return {
        ...ev,
        ...regStatus,
      };
    });

    this.publicEventsCache = { data: result, expiresAt: now + 15000 };
    return result;
  }

  /**
   * Public Event Details API: Finds by code or id, strictly verifies public visibility
   */
  async getPublicEventBySlug(slug: string) {
    if (!slug) throw new NotFoundException('Event identifier is required.');

    const cacheKey = slug.toLowerCase();
    const now = Date.now();
    const cached = this.slugCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const event = await this.db.event.findFirst({
      where: {
        OR: [
          { id: slug },
          { code: { equals: slug, mode: 'insensitive' } },
        ],
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      select: {
        id: true,
        name: true,
        code: true,
        location: true,
        startDate: true,
        endDate: true,
        logoUrl: true,
        description: true,
        registrationOpenDate: true,
        registrationCloseDate: true,
        status: true,
        categories: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found or not published.');
    }

    const regStatus = this.calculateRegistrationStatus(event);

    // Standard dynamic category custom fields
    const dynamicCustomFields = [
      {
        name: 'height',
        label: 'Height (e.g. 5ft 8in)',
        type: 'text' as const,
        required: false,
        placeholder: '5 ft 8 in',
      },
      {
        name: 'instagram',
        label: 'Instagram Profile Handle',
        type: 'text' as const,
        required: false,
        placeholder: '@yourhandle',
      },
      {
        name: 'experience',
        label: 'Prior Pageant / Modeling Experience',
        type: 'select' as const,
        required: false,
        options: ['None / Beginner', '1-2 Local Shows', 'State / National Level', 'Professional Model'],
      },
      {
        name: 'profession',
        label: 'Current Profession / Education',
        type: 'text' as const,
        required: false,
        placeholder: 'Student / Professional',
      },
      {
        name: 'emergencyContact',
        label: 'Emergency Contact Person & Phone',
        type: 'text' as const,
        required: false,
        placeholder: 'Name (9876543210)',
      },
    ];

    const result = {
      ...event,
      ...regStatus,
      customFields: dynamicCustomFields,
    };

    this.slugCache.set(cacheKey, { data: result, expiresAt: now + 15000 });
    return result;
  }
}
