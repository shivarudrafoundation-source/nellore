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

    return judge;
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

  async create(
    data: {
      name: string;
      email: string;
      eventId: string;
      categoryId: string;
      roundId: string;
    },
    actorId: string,
    ipAddress?: string,
  ) {
    if (!data.name?.trim()) throw new BadRequestException('Judge name is required.');
    if (!data.email?.trim() || !data.email.includes('@')) {
      throw new BadRequestException('Valid email address is required.');
    }
    if (!data.eventId) throw new BadRequestException('Event assignment is required.');
    if (!data.categoryId) throw new BadRequestException('Category assignment is required.');
    if (!data.roundId) throw new BadRequestException('Round assignment is required.');

    const email = data.email.trim().toLowerCase();

    // Check unique email
    const existing = await this.db.judgeAccount.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A judge with this email address already exists.');
    }

    // Validate relationship
    await this.validateAssignmentHierarchy(data.eventId, data.categoryId, data.roundId);

    const tempPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const judge = await this.db.judgeAccount.create({
      data: {
        name: data.name.trim(),
        email,
        passwordHash,
        assignedEventId: data.eventId,
        assignedCategoryId: data.categoryId,
        assignedRoundId: data.roundId,
        mustResetPassword: true,
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
        assignedRoundId: true,
        createdAt: true,
        event: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
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
      temporaryPassword: tempPassword, // Returned ONLY once upon creation
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
    data: { eventId: string; categoryId: string; roundId: string },
    actorId: string,
    ipAddress?: string,
  ) {
    const judge = await this.db.judgeAccount.findUnique({ where: { id } });
    if (!judge) throw new NotFoundException('Judge account not found.');

    // Check duplicate identical assignment
    if (
      judge.assignedEventId === data.eventId &&
      judge.assignedCategoryId === data.categoryId &&
      judge.assignedRoundId === data.roundId
    ) {
      throw new ConflictException('Judge is already assigned to this round.');
    }

    await this.validateAssignmentHierarchy(data.eventId, data.categoryId, data.roundId);

    const updated = await this.db.judgeAccount.update({
      where: { id },
      data: {
        assignedEventId: data.eventId,
        assignedCategoryId: data.categoryId,
        assignedRoundId: data.roundId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedEventId: true,
        assignedCategoryId: true,
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

  async resetPassword(id: string, actorId: string, ipAddress?: string) {
    const judge = await this.db.judgeAccount.findUnique({ where: { id } });
    if (!judge) throw new NotFoundException('Judge account not found.');

    const tempPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.db.judgeAccount.update({
      where: { id },
      data: {
        passwordHash,
        mustResetPassword: true,
      },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId,
      action: 'JUDGE_PASSWORD_RESET',
      entity: 'JudgeAccount',
      entityId: id,
      after: { mustResetPassword: true },
      ipAddress,
    });

    return {
      message: 'Judge password has been reset successfully.',
      temporaryPassword: tempPassword, // Returned ONLY once in immediate response
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
