import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContestantsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    eventId?: string;
    categoryId?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ContestantWhereInput = {};

    if (query.eventId) where.eventId = query.eventId;
    if (query.categoryId) where.registration = { categoryId: query.categoryId };

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { id: { contains: s, mode: 'insensitive' } },
        { mobile: { contains: s, mode: 'insensitive' } },
        {
          registration: {
            baseFields: {
              path: ['name'],
              string_contains: s,
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.contestant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          mobile: true,
          eventId: true,
          createdAt: true,
          event: { select: { id: true, name: true, code: true } },
          registration: {
            select: {
              id: true,
              paymentStatus: true,
              baseFields: true,
              category: { select: { id: true, name: true, code: true } },
            },
          },
          _count: { select: { scores: true } },
        },
      }),
      this.db.contestant.count({ where }),
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
    const contestant = await this.db.contestant.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true, code: true, location: true, startDate: true, endDate: true, logoUrl: true } },
        registration: {
          include: {
            category: { select: { id: true, name: true, code: true } },
          },
        },
        scores: {
          include: {
            round: { select: { id: true, name: true, maxMarks: true, day: true } },
            judge: { select: { id: true, name: true, email: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant not found.');
    }

    return contestant;
  }

  /**
   * Generates sequential Contestant ID: SRF-NLR26-${CATEGORY_CODE}-${SEQUENCE}
   */
  async generateContestantId(tx: Prisma.TransactionClient, categoryCode: string): Promise<string> {
    const normCode = categoryCode.toUpperCase().trim();
    let mappedCode = normCode;
    if (normCode === 'K' || normCode.includes('KID')) mappedCode = 'KIDS';
    else if (normCode === 'T' || normCode.includes('TEEN')) mappedCode = 'TEEN';
    else if (normCode === 'MISS' || normCode.includes('MISS')) mappedCode = 'MISS';
    else if (normCode === 'MS' || normCode === 'MRS' || normCode.includes('MS')) mappedCode = 'MS';
    else if (normCode === 'MR' || normCode.includes('MR')) mappedCode = 'MR';

    const prefix = `SRF-NLR26-${mappedCode}`;

    const latest = await tx.contestant.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    let nextSeq = 1;
    if (latest && latest.id) {
      const parts = latest.id.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextSeq = lastNum + 1;
      }
    }

    let candidateId = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    let exists = await tx.contestant.findUnique({ where: { id: candidateId } });
    while (exists) {
      nextSeq += 1;
      candidateId = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
      exists = await tx.contestant.findUnique({ where: { id: candidateId } });
    }

    return candidateId;
  }

  /**
   * Admin direct Contestant Creation (No Payment / Public Registration Required)
   */
  async createContestant(
    dto: {
      eventId?: string;
      categoryId: string;
      name: string;
      mobile: string;
      email?: string;
      gender: string;
      dob: string;
      age: number | string;
      location: string;
      customFields?: Record<string, any>;
    },
    actorId: string,
    ipAddress?: string,
  ) {
    if (!dto.categoryId) throw new BadRequestException('Category ID is required.');
    if (!dto.name || dto.name.trim().length < 2) throw new BadRequestException('Valid full name is required.');

    const normalizedMobile = String(dto.mobile || '').trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      throw new BadRequestException('Valid 10-digit Indian mobile number is required.');
    }

    const category = await this.db.category.findUnique({
      where: { id: dto.categoryId },
      include: { event: true },
    });

    if (!category) throw new NotFoundException('Category not found.');

    const eventId = dto.eventId || category.eventId;
    if (category.eventId !== eventId) {
      throw new BadRequestException('Category does not belong to the specified event.');
    }

    const numAge = Number(dto.age);
    if (isNaN(numAge) || numAge <= 0) throw new BadRequestException('Valid age is required.');

    const createdContestant = await this.db.$transaction(
      async (tx) => {
        const contestantId = await this.generateContestantId(tx, category.code);

        const registration = await tx.registration.create({
          data: {
            eventId,
            categoryId: category.id,
            baseFields: {
              name: dto.name.trim(),
              mobile: normalizedMobile,
              email: dto.email ? dto.email.trim() : undefined,
              gender: dto.gender ? dto.gender.trim().toUpperCase() : 'OTHER',
              dob: dto.dob || new Date().toISOString().slice(0, 10),
              age: numAge,
              location: dto.location ? dto.location.trim() : 'Nellore',
            },
            customFields: dto.customFields || {},
            paymentStatus: 'PAID',
          },
        });

        const contestant = await tx.contestant.create({
          data: {
            id: contestantId,
            registrationId: registration.id,
            mobile: normalizedMobile,
            eventId,
          },
          include: {
            event: { select: { id: true, name: true, code: true } },
            registration: {
              include: {
                category: { select: { id: true, name: true, code: true } },
              },
            },
          },
        });

        await tx.registration.update({
          where: { id: registration.id },
          data: { contestantId: contestant.id },
        });

        return contestant;
      },
      { maxWait: 10000, timeout: 20000 },
    );

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'CONTESTANT_CREATED',
      entity: 'Contestant',
      entityId: createdContestant.id,
      before: null,
      after: {
        id: createdContestant.id,
        name: dto.name.trim(),
        category: category.name,
        categoryCode: category.code,
        mobileMasked: `******${normalizedMobile.slice(-4)}`,
      },
      ipAddress,
    });

    return createdContestant;
  }

  /**
   * Judge-safe serialization to strictly enforce Judge Blindness.
   * Strips all PII: Name, Mobile, Email, DOB, Age, Location, Private Custom Fields.
   */
  serializeForJudge(contestant: any) {
    return {
      id: contestant.id,
      eventId: contestant.eventId,
      categoryId: contestant.registration?.categoryId || contestant.categoryId,
    };
  }

  async deleteContestant(id: string, adminId: string, ipAddress?: string) {
    const contestant = await this.db.contestant.findUnique({
      where: { id },
      include: {
        registration: true,
      },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant record not found.');
    }

    await this.db.$transaction(async (tx) => {
      // 1. Delete associated scores
      await tx.score.deleteMany({
        where: { contestantId: id },
      });

      // 2. Unlink contestant from registration if exists
      if (contestant.registration) {
        await tx.registration.update({
          where: { id: contestant.registration.id },
          data: { contestantId: null },
        });
      }

      // 3. Delete contestant
      await tx.contestant.delete({
        where: { id },
      });
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'CONTESTANT_DELETED',
      entity: 'Contestant',
      entityId: id,
      before: {
        id: contestant.id,
        eventId: contestant.eventId,
        registrationId: contestant.registrationId,
        mobile: contestant.mobile,
      },
      after: null,
      ipAddress,
    });

    return {
      success: true,
      message: 'Contestant deleted successfully.',
    };
  }
}
