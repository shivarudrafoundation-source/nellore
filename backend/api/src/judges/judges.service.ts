import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

@Injectable()
export class JudgesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Secure temporary password generator (12+ chars, uppercase, lowercase, numbers, special char)
   */
  private generateTemporaryPassword(): string {
    const raw = crypto.randomBytes(8).toString('hex');
    return `Jdg!${raw}9A`;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    eventId?: string;
    categoryId?: string;
    roundId?: string;
    isActive?: boolean;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.JudgeAccountWhereInput = {};

    if (query.eventId) where.assignedEventId = query.eventId;
    if (query.categoryId) where.assignedCategoryId = query.categoryId;
    if (query.roundId) where.assignedRoundId = query.roundId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.judgeAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          mustResetPassword: true,
          isActive: true,
          assignedCategoryIds: true,
          createdAt: true,
          event: { select: { id: true, name: true, code: true } },
          category: { select: { id: true, name: true, code: true } },
          round: { select: { id: true, name: true, maxMarks: true, day: true, sortOrder: true } },
          _count: { select: { scores: true } },
        },
      }),
      this.db.judgeAccount.count({ where }),
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
    const judge = await this.db.judgeAccount.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        mustResetPassword: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        assignedEventId: true,
        assignedCategoryId: true,
        assignedCategoryIds: true,
        assignedRoundId: true,
        event: { select: { id: true, name: true, code: true, location: true } },
        category: { select: { id: true, name: true, code: true } },
        round: { select: { id: true, name: true, maxMarks: true, day: true, sortOrder: true, status: true } },
        scores: {
          select: {
            id: true,
            value: true,
            locked: true,
            submittedAt: true,
            contestantId: true,
            round: { select: { id: true, name: true } },
          },
          orderBy: { submittedAt: 'desc' },
          take: 20,
        },
        _count: { select: { scores: true } },
      },
    });

    if (!judge) {
      throw new NotFoundException('Judge account not found.');
    }

    const assignedCatIds: string[] = Array.isArray(judge.assignedCategoryIds) && (judge.assignedCategoryIds as string[]).length > 0
      ? (judge.assignedCategoryIds as string[])
      : [judge.assignedCategoryId];

    const assignedCategories = await this.db.category.findMany({
      where: { id: { in: assignedCatIds } },
      include: {
        rounds: {
          where: { scoredBy: 'judge' },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return {
      ...judge,
      assignedCategories,
    };
  }

  /**
   * Validate Event -> Category -> Round relationship integrity
   */
  async validateAssignmentHierarchy(eventId: string, categoryId: string, roundId: string) {
    const [event, category, round] = await Promise.all([
      this.db.event.findUnique({ where: { id: eventId }, select: { id: true } }),
      this.db.category.findUnique({ where: { id: categoryId }, select: { id: true, eventId: true } }),
      this.db.round.findUnique({ where: { id: roundId }, select: { id: true, categoryId: true } }),
    ]);

    if (!event) {
      throw new BadRequestException('Selected event does not exist.');
    }
    if (!category) {
      throw new BadRequestException('Selected category does not exist.');
    }
    if (category.eventId !== eventId) {
      throw new BadRequestException('Selected category does not belong to the selected event.');
    }
    if (!round) {
      throw new BadRequestException('Selected round does not exist.');
    }
    if (round.categoryId !== categoryId) {
      throw new BadRequestException('Selected round does not belong to the selected category.');
    }

    return { event, category, round };
  }

  /**
   * Clean temporary password generator
   */
  private generateCleanPassword(): string {
    const randomDigits = String(Math.floor(1000 + Math.random() * 9000));
    return `SRF@${randomDigits}`;
  }

  async create(
    data: {
      id?: string;
      name: string;
      email: string;
      password?: string;
      eventId: string;
      categoryId?: string;
      categoryIds?: string[];
      roundId?: string;
    },
    actorId: string,
    ipAddress?: string,
  ) {
    if (!data.name?.trim()) throw new BadRequestException('Judge name is required.');
    if (!data.email?.trim() || !data.email.includes('@')) {
      throw new BadRequestException('Valid email address is required.');
    }
    if (!data.eventId) throw new BadRequestException('Event assignment is required.');

    const categoryIds = (data.categoryIds && data.categoryIds.length > 0)
      ? data.categoryIds
      : (data.categoryId ? [data.categoryId] : []);

    if (categoryIds.length === 0) {
      throw new BadRequestException('At least one Category assignment is required.');
    }

    const primaryCategoryId = categoryIds[0];

    // Find default round for primary category if not explicitly provided
    let targetRoundId = data.roundId;
    if (!targetRoundId) {
      const defaultRound = await this.db.round.findFirst({
        where: { categoryId: primaryCategoryId, scoredBy: 'judge' },
        orderBy: { sortOrder: 'asc' },
      });
      if (!defaultRound) {
        const anyRound = await this.db.round.findFirst({ where: { categoryId: primaryCategoryId } });
        if (!anyRound) throw new BadRequestException('No rounds found for selected category.');
        targetRoundId = anyRound.id;
      } else {
        targetRoundId = defaultRound.id;
      }
    } else {
      await this.validateAssignmentHierarchy(data.eventId, primaryCategoryId, targetRoundId);
    }

    const email = data.email.trim().toLowerCase();

    // Check unique email
    const existingEmail = await this.db.judgeAccount.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('A judge with this email address already exists.');
    }

    let judgeId = data.id ? String(data.id).trim().toUpperCase() : '';
    if (judgeId) {
      if (judgeId.length < 1 || !/^[A-Z0-9_-]+$/i.test(judgeId)) {
        throw new BadRequestException('Invalid Judge ID format. Must contain alphanumeric characters, hyphens or underscores.');
      }
      const existingId = await this.db.judgeAccount.findUnique({ where: { id: judgeId } });
      if (existingId) {
        throw new ConflictException(`Judge ID "${judgeId}" already exists.`);
      }
    } else {
      // Auto-generate sequential Judge ID e.g. JUDGE-01
      const count = await this.db.judgeAccount.count();
      let nextNum = count + 1;
      let candidateId = `JUDGE-${String(nextNum).padStart(2, '0')}`;
      while (await this.db.judgeAccount.findUnique({ where: { id: candidateId } })) {
        nextNum += 1;
        candidateId = `JUDGE-${String(nextNum).padStart(2, '0')}`;
      }
      judgeId = candidateId;
    }

    const plainPassword = data.password && String(data.password).trim() ? String(data.password).trim() : this.generateCleanPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const judge = await this.db.judgeAccount.create({
      data: {
        id: judgeId,
        name: data.name.trim(),
        email,
        passwordHash,
        assignedEventId: data.eventId,
        assignedCategoryId: primaryCategoryId,
        assignedCategoryIds: categoryIds,
        assignedRoundId: targetRoundId,
        mustResetPassword: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mustResetPassword: true,
        isActive: true,
        assignedEventId: true,
        assignedCategoryId: true,
        assignedCategoryIds: true,
        assignedRoundId: true,
        createdAt: true,
        event: { select: { id: true, name: true, code: true } },
        category: { select: { id: true, name: true, code: true } },
        round: { select: { id: true, name: true } },
      },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'JUDGE_CREATED',
      entity: 'JudgeAccount',
      entityId: judge.id,
      after: {
        id: judge.id,
        email: judge.email,
        name: judge.name,
        assignedEventId: judge.assignedEventId,
        assignedCategoryId: judge.assignedCategoryId,
        assignedRoundId: judge.assignedRoundId,
      },
      ipAddress,
    });

    return {
      judge,
      password: plainPassword,
      temporaryPassword: plainPassword,
    };
  }

  async update(
    id: string,
    data: { name?: string; email?: string },
    actorId: string,
    ipAddress?: string,
  ) {
    const judge = await this.db.judgeAccount.findUnique({ where: { id } });
    if (!judge) throw new NotFoundException('Judge account not found.');

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new BadRequestException('Judge name cannot be empty.');
      updateData.name = data.name.trim();
    }

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      if (!email || !email.includes('@')) throw new BadRequestException('Valid email address is required.');
      if (email !== judge.email) {
        const dup = await this.db.judgeAccount.findUnique({ where: { email } });
        if (dup) throw new ConflictException('A judge with this email already exists.');
      }
      updateData.email = email;
    }

    const updated = await this.db.judgeAccount.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        mustResetPassword: true,
        isActive: true,
      },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'JUDGE_UPDATED',
      entity: 'JudgeAccount',
      entityId: id,
      before: { name: judge.name, email: judge.email },
      after: { name: updated.name, email: updated.email },
      ipAddress,
    });

    return updated;
  }

  async assign(
    id: string,
    data: { eventId: string; categoryId?: string; categoryIds?: string[]; roundId?: string },
    actorId: string,
    ipAddress?: string,
  ) {
    const judge = await this.db.judgeAccount.findUnique({ where: { id } });
    if (!judge) throw new NotFoundException('Judge account not found.');

    const categoryIds = (data.categoryIds && data.categoryIds.length > 0)
      ? data.categoryIds
      : (data.categoryId ? [data.categoryId] : []);

    if (categoryIds.length === 0) {
      throw new BadRequestException('At least one Category assignment is required.');
    }

    const primaryCategoryId = categoryIds[0];

    let targetRoundId = data.roundId;
    if (!targetRoundId) {
      const defaultRound = await this.db.round.findFirst({
        where: { categoryId: primaryCategoryId, scoredBy: 'judge' },
        orderBy: { sortOrder: 'asc' },
      });
      if (!defaultRound) {
        const anyRound = await this.db.round.findFirst({ where: { categoryId: primaryCategoryId } });
        if (!anyRound) throw new BadRequestException('No rounds found for selected category.');
        targetRoundId = anyRound.id;
      } else {
        targetRoundId = defaultRound.id;
      }
    } else {
      await this.validateAssignmentHierarchy(data.eventId, primaryCategoryId, targetRoundId);
    }

    const updated = await this.db.judgeAccount.update({
      where: { id },
      data: {
        assignedEventId: data.eventId,
        assignedCategoryId: primaryCategoryId,
        assignedCategoryIds: categoryIds,
        assignedRoundId: targetRoundId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedEventId: true,
        assignedCategoryId: true,
        assignedCategoryIds: true,
        assignedRoundId: true,
        event: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        round: { select: { id: true, name: true } },
      },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'JUDGE_ASSIGNED',
      entity: 'JudgeAccount',
      entityId: id,
      before: {
        eventId: judge.assignedEventId,
        categoryId: judge.assignedCategoryId,
        roundId: judge.assignedRoundId,
      },
      after: {
        eventId: updated.assignedEventId,
        categoryId: updated.assignedCategoryId,
        roundId: updated.assignedRoundId,
      },
      ipAddress,
    });

    return updated;
  }

  async resetPassword(
    id: string,
    dto: { password?: string } | undefined,
    actorId: string,
    ipAddress?: string,
  ) {
    const judge = await this.db.judgeAccount.findUnique({ where: { id } });
    if (!judge) throw new NotFoundException('Judge account not found.');

    const plainPassword = dto?.password && String(dto.password).trim() ? String(dto.password).trim() : this.generateCleanPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await this.db.judgeAccount.update({
      where: { id },
      data: {
        passwordHash,
        mustResetPassword: false,
      },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'JUDGE_PASSWORD_RESET',
      entity: 'JudgeAccount',
      entityId: id,
      after: { mustResetPassword: false },
      ipAddress,
    });

    return {
      message: 'Judge password has been updated successfully.',
      password: plainPassword,
      temporaryPassword: plainPassword,
    };
  }

  async disable(id: string, actorId: string, ipAddress?: string) {
    const judge = await this.db.judgeAccount.findUnique({ where: { id } });
    if (!judge) throw new NotFoundException('Judge account not found.');

    const updated = await this.db.judgeAccount.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, email: true, isActive: true },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'JUDGE_DISABLED',
      entity: 'JudgeAccount',
      entityId: id,
      after: { isActive: false },
      ipAddress,
    });

    return updated;
  }

  async enable(id: string, actorId: string, ipAddress?: string) {
    const judge = await this.db.judgeAccount.findUnique({ where: { id } });
    if (!judge) throw new NotFoundException('Judge account not found.');

    const updated = await this.db.judgeAccount.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, name: true, email: true, isActive: true },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'JUDGE_ENABLED',
      entity: 'JudgeAccount',
      entityId: id,
      after: { isActive: true },
      ipAddress,
    });

    return updated;
  }
}
