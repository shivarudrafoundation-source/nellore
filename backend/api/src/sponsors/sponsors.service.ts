import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateSponsorDto, UpdateSponsorDto } from './sponsors.types.js';

@Injectable()
export class SponsorsService {
  private readonly logger = new Logger(SponsorsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Fetch all sponsors. If not in admin mode, returns only active sponsors sorted by order and creation date.
   */
  async findAll(adminMode: boolean = false) {
    const where = adminMode ? {} : { isActive: true };
    return this.db.sponsor.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Fetch a single sponsor by ID
   */
  async findOne(id: string) {
    const sponsor = await this.db.sponsor.findUnique({
      where: { id },
    });
    if (!sponsor) {
      throw new NotFoundException(`Sponsor with ID "${id}" not found.`);
    }
    return sponsor;
  }

  /**
   * Create a new sponsor record
   */
  async create(dto: CreateSponsorDto, adminId?: string, ipAddress?: string) {
    if (!dto.name || dto.name.trim().length < 2) {
      throw new BadRequestException('Sponsor name must be at least 2 characters.');
    }
    if (!dto.logoUrl || dto.logoUrl.trim().length < 3) {
      throw new BadRequestException('Valid logo image URL or asset path is required.');
    }

    const sponsor = await this.db.sponsor.create({
      data: {
        name: dto.name.trim(),
        tier: dto.tier ? dto.tier.toUpperCase().trim() : 'POWERED_BY',
        logoUrl: dto.logoUrl.trim(),
        websiteUrl: dto.websiteUrl ? dto.websiteUrl.trim() : null,
        description: dto.description ? dto.description.trim() : null,
        order: typeof dto.order === 'number' ? dto.order : 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    if (adminId) {
      await this.audit.log({
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'SPONSOR_CREATED' as any,
        entity: 'Sponsor',
        entityId: sponsor.id,
        after: sponsor,
        ipAddress,
      });
    }

    return sponsor;
  }

  /**
   * Update an existing sponsor
   */
  async update(id: string, dto: UpdateSponsorDto, adminId?: string, ipAddress?: string) {
    const existing = await this.findOne(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.tier !== undefined) data.tier = dto.tier.toUpperCase().trim();
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl.trim();
    if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl ? dto.websiteUrl.trim() : null;
    if (dto.description !== undefined) data.description = dto.description ? dto.description.trim() : null;
    if (dto.order !== undefined) data.order = Number(dto.order);
    if (dto.isActive !== undefined) data.isActive = Boolean(dto.isActive);

    const updated = await this.db.sponsor.update({
      where: { id },
      data,
    });

    if (adminId) {
      await this.audit.log({
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'SPONSOR_UPDATED' as any,
        entity: 'Sponsor',
        entityId: updated.id,
        before: existing,
        after: updated,
        ipAddress,
      });
    }

    return updated;
  }

  /**
   * Delete a sponsor
   */
  async delete(id: string, adminId?: string, ipAddress?: string) {
    const existing = await this.findOne(id);

    await this.db.sponsor.delete({
      where: { id },
    });

    if (adminId) {
      await this.audit.log({
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'SPONSOR_DELETED' as any,
        entity: 'Sponsor',
        entityId: id,
        before: existing,
        ipAddress,
      });
    }

    return { success: true, message: `Sponsor "${existing.name}" deleted successfully.` };
  }
}
