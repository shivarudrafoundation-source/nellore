import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { MailService } from '../mail/mail.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly mailService?: MailService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    eventId?: string;
    categoryId?: string;
    paymentStatus?: 'PAID' | 'UNPAID';
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.RegistrationWhereInput = {};

    if (query.eventId) where.eventId = query.eventId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.paymentStatus && ['PAID', 'UNPAID'].includes(query.paymentStatus)) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { id: { contains: s, mode: 'insensitive' } },
        { contestantId: { contains: s, mode: 'insensitive' } },
        {
          // Postgres JSON query filter via path
          baseFields: {
            path: ['name'],
            string_contains: s,
          },
        },
        {
          baseFields: {
            path: ['mobile'],
            string_contains: s,
          },
        },
        {
          baseFields: {
            path: ['email'],
            string_contains: s,
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.registration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          eventId: true,
          categoryId: true,
          baseFields: true,
          paymentStatus: true,
          contestantId: true,
          createdAt: true,
          event: { select: { id: true, name: true, code: true } },
          category: { select: { id: true, name: true, code: true } },
          contestant: { select: { id: true } },
        },
      }),
      this.db.registration.count({ where }),
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
    const reg = await this.db.registration.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true, code: true, location: true, startDate: true, endDate: true } },
        category: { select: { id: true, name: true, code: true } },
        contestant: {
          select: {
            id: true,
            createdAt: true,
            scores: {
              select: {
                id: true,
                value: true,
                locked: true,
                round: { select: { id: true, name: true, maxMarks: true } },
              },
            },
          },
        },
      },
    });

    if (!reg) {
      throw new NotFoundException('Registration not found.');
    }

    return reg;
  }

  /**
   * Safe sequential Contestant ID generator: SRF-{EVENT_CODE}-{CAT_CODE}-{SEQUENCE}
   */
  async generateContestantId(tx: Prisma.TransactionClient, eventCode: string, categoryCode: string): Promise<string> {
    const cleanEvent = eventCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanCat = categoryCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const prefix = `SRF-${cleanEvent}-${cleanCat}`;

    // Query highest existing sequence
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
   * Admin-only: Verify Payment and Assign Contestant ID in an atomic PostgreSQL transaction
   */
  async verifyPaymentAndAssignContestant(
    id: string,
    dto: { contestantId?: string },
    actorId: string,
    ipAddress?: string,
  ) {
    const rawContestantId = String(dto.contestantId || '').trim().toUpperCase();
    if (!rawContestantId) {
      throw new BadRequestException('Contestant ID must be provided by the admin.');
    }

    if (rawContestantId.length < 3 || !/^[A-Z0-9_-]+$/i.test(rawContestantId)) {
      throw new BadRequestException('Invalid Contestant ID format. Must contain alphanumeric characters, hyphens or underscores.');
    }

    return this.db.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id },
        include: {
          event: { select: { id: true, code: true, name: true } },
          category: { select: { id: true, code: true, name: true } },
          contestant: true,
        },
      });

      if (!registration) {
        throw new NotFoundException('Registration not found.');
      }

      // 1. Check if Contestant ID is already assigned to a different registration
      const existingWithId = await tx.contestant.findUnique({
        where: { id: rawContestantId },
      });

      if (existingWithId && existingWithId.registrationId !== registration.id) {
        throw new ConflictException(`Contestant ID "${rawContestantId}" is already assigned to another contestant.`);
      }

      // 2. Check if registration is already verified with this contestant ID (idempotency)
      if (registration.paymentStatus === 'PAID' && registration.contestantId === rawContestantId && existingWithId) {
        return {
          registration,
          contestant: existingWithId,
          message: 'Payment is already verified and Contestant ID assigned.',
        };
      }

      const base = (registration.baseFields as any) || {};
      const mobile = base.mobile || 'N/A';
      const email = base.email;
      const applicantName = base.name || 'Contestant';

      // 3. Create or update Contestant record
      let contestant = existingWithId;
      if (!contestant) {
        const existingForReg = await tx.contestant.findUnique({
          where: { registrationId: registration.id },
        });

        if (existingForReg) {
          contestant = await tx.contestant.update({
            where: { id: existingForReg.id },
            data: { id: rawContestantId, mobile, eventId: registration.eventId },
          });
        } else {
          contestant = await tx.contestant.create({
            data: {
              id: rawContestantId,
              registrationId: registration.id,
              mobile,
              eventId: registration.eventId,
            },
          });
        }
      }

      // 4. Update Registration status & contestantId
      const updatedRegistration = await tx.registration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: 'PAID',
          contestantId: contestant.id,
        },
        include: { event: true, category: true, contestant: true },
      });

      // 5. Audit logs (PAYMENT_VERIFIED, CONTESTANT_ID_ASSIGNED, CONTESTANT_ACTIVATED)
      await this.audit.log({
        actorType: 'ADMIN',
        actorId,
        action: 'PAYMENT_VERIFIED',
        entity: 'Registration',
        entityId: id,
        before: { paymentStatus: registration.paymentStatus },
        after: { paymentStatus: 'PAID' },
        ipAddress,
      });

      await this.audit.log({
        actorType: 'ADMIN',
        actorId,
        action: 'CONTESTANT_ID_ASSIGNED',
        entity: 'Contestant',
        entityId: contestant.id,
        after: { contestantId: contestant.id, registrationId: registration.id },
        ipAddress,
      });

      await this.audit.log({
        actorType: 'ADMIN',
        actorId,
        action: 'CONTESTANT_ACTIVATED',
        entity: 'Contestant',
        entityId: contestant.id,
        after: { status: 'ACTIVE', contestantId: contestant.id },
        ipAddress,
      });

      // 6. Asynchronously trigger Contestant Activation Email
      if (email && this.mailService) {
        this.mailService
          .sendContestantActivationEmail(email, {
            name: applicantName,
            contestantId: contestant.id,
            categoryName: registration.category.name,
            eventName: registration.event.name,
          })
          .catch(() => {});
      }

      return {
        registration: updatedRegistration,
        contestant,
        message: 'Payment verified and Contestant ID assigned successfully.',
      };
    }, { timeout: 15000, maxWait: 10000 });
  }

  /**
   * Admin-only: Explicitly verify payment for a registration (Idempotent)
   */
  async verifyPayment(id: string, actorId: string, ipAddress?: string) {
    return this.db.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id },
        include: { event: true, category: true, contestant: true },
      });

      if (!registration) {
        throw new NotFoundException('Registration not found.');
      }

      if (registration.paymentStatus === 'PAID') {
        return registration;
      }

      const updated = await tx.registration.update({
        where: { id },
        data: { paymentStatus: 'PAID' },
        include: { event: true, category: true, contestant: true },
      });

      await this.audit.log({
        actorType: 'ADMIN',
        actorId,
        action: 'PAYMENT_VERIFIED',
        entity: 'Registration',
        entityId: id,
        before: { paymentStatus: 'UNPAID' },
        after: { paymentStatus: 'PAID' },
        ipAddress,
      });

      return updated;
    });
  }

  /**
   * Admin-only: Create and activate Contestant from PAID registration (Idempotent & Concurrency-Safe)
   */
  async createContestant(id: string, actorId: string, ipAddress?: string) {
    return this.db.$transaction(
      async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id },
        include: {
          event: { select: { id: true, code: true, name: true } },
          category: { select: { id: true, code: true, name: true } },
          contestant: true,
        },
      });

      if (!registration) {
        throw new NotFoundException('Registration not found.');
      }

      // Hard business rule: Cannot activate contestant if payment is UNPAID
      if (registration.paymentStatus !== 'PAID') {
        throw new BadRequestException('Payment must be verified before creating or activating a contestant.');
      }

      // Idempotency: Return existing contestant if already created
      if (registration.contestant) {
        return {
          contestant: registration.contestant,
          registration,
          message: 'Contestant is already active.',
        };
      }

      const existingContestant = await tx.contestant.findUnique({
        where: { registrationId: registration.id },
      });

      if (existingContestant) {
        // Link if not linked
        if (registration.contestantId !== existingContestant.id) {
          await tx.registration.update({
            where: { id: registration.id },
            data: { contestantId: existingContestant.id },
          });
        }
        return {
          contestant: existingContestant,
          registration,
          message: 'Contestant is already active.',
        };
      }

      // Generate unique sequential contestant ID: SRF-{EVENT_CODE}-{CAT_CODE}-{SEQUENCE}
      const contestantId = await this.generateContestantId(
        tx,
        registration.event.code,
        registration.category.code,
      );

      const base = (registration.baseFields as any) || {};
      const mobile = base.mobile || 'N/A';

      const newContestant = await tx.contestant.create({
        data: {
          id: contestantId,
          registrationId: registration.id,
          mobile,
          eventId: registration.eventId,
        },
      });

      const updatedReg = await tx.registration.update({
        where: { id: registration.id },
        data: { contestantId: newContestant.id },
        include: { event: true, category: true, contestant: true },
      });

      await this.audit.log({
        actorType: 'ADMIN',
        actorId,
        action: 'CONTESTANT_CREATED',
        entity: 'Contestant',
        entityId: newContestant.id,
        after: { contestantId: newContestant.id, registrationId: registration.id },
        ipAddress,
      });

      await this.audit.log({
        actorType: 'ADMIN',
        actorId,
        action: 'CONTESTANT_ACTIVATED',
        entity: 'Contestant',
        entityId: newContestant.id,
        after: { status: 'ACTIVE', contestantId: newContestant.id },
        ipAddress,
      });

      return {
        contestant: newContestant,
        registration: updatedReg,
        message: 'Contestant created and activated successfully.',
      };
    }, { timeout: 15000, maxWait: 10000 });
  }

  /**
   * Status update handler for PATCH /admin/registrations/:id (Atomic verification + creation)
   */
  async updateStatus(
    id: string,
    data: { paymentStatus?: 'PAID' | 'UNPAID' },
    actorId: string,
    ipAddress?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id },
        include: {
          event: { select: { id: true, code: true, name: true } },
          category: { select: { id: true, code: true, name: true } },
          contestant: true,
        },
      });

      if (!registration) {
        throw new NotFoundException('Registration not found.');
      }

      const beforeState = {
        paymentStatus: registration.paymentStatus,
        contestantId: registration.contestantId,
      };

      if (data.paymentStatus === 'PAID') {
        let contestant = registration.contestant;

        if (!contestant) {
          const existingContestant = await tx.contestant.findUnique({
            where: { registrationId: registration.id },
          });

          if (existingContestant) {
            contestant = existingContestant;
          } else {
            const contestantId = await this.generateContestantId(
              tx,
              registration.event.code,
              registration.category.code,
            );

            const base = (registration.baseFields as any) || {};
            const mobile = base.mobile || 'N/A';

            contestant = await tx.contestant.create({
              data: {
                id: contestantId,
                registrationId: registration.id,
                mobile,
                eventId: registration.eventId,
              },
            });

            await this.audit.log({
              actorType: 'ADMIN',
              actorId,
              action: 'CONTESTANT_CREATED',
              entity: 'Contestant',
              entityId: contestant.id,
              after: { contestantId: contestant.id, registrationId: registration.id },
              ipAddress,
            });

            await this.audit.log({
              actorType: 'ADMIN',
              actorId,
              action: 'CONTESTANT_ACTIVATED',
              entity: 'Contestant',
              entityId: contestant.id,
              after: { status: 'ACTIVE', contestantId: contestant.id },
              ipAddress,
            });
          }
        }

        const updatedReg = await tx.registration.update({
          where: { id },
          data: {
            paymentStatus: 'PAID',
            contestantId: contestant.id,
          },
          include: { contestant: true, event: true, category: true },
        });

        await this.audit.log({
          actorType: 'ADMIN',
          actorId,
          action: 'PAYMENT_VERIFIED',
          entity: 'Registration',
          entityId: id,
          before: beforeState,
          after: { paymentStatus: 'PAID', contestantId: contestant.id },
          ipAddress,
        });

        return updatedReg;
      }

      if (data.paymentStatus === 'UNPAID') {
        const updatedReg = await tx.registration.update({
          where: { id },
          data: { paymentStatus: 'UNPAID' },
          include: { contestant: true, event: true, category: true },
        });

        await this.audit.log({
          actorType: 'ADMIN',
          actorId,
          action: 'REGISTRATION_UPDATED',
          entity: 'Registration',
          entityId: id,
          before: beforeState,
          after: { paymentStatus: 'UNPAID' },
          ipAddress,
        });

        return updatedReg;
      }

      return registration;
    });
  }

  /**
   * Public Registration Creation API with strict validation and duplicate prevention
   */
  async createPublicRegistration(
    dto: {
      eventId: string;
      categoryId: string;
      userId?: string;
      baseFields: {
        userId?: string;
        name: string;
        mobile: string;
        location: string;
        gender: string;
        email?: string;
        age: number | string;
        dob: string;
        passwordHash?: string;
      };
      customFields?: Record<string, any>;
      idempotencyKey?: string;
    },
    ipAddress?: string,
  ) {
    if (!dto.eventId || !dto.categoryId) {
      throw new BadRequestException('Event ID and Category ID are required.');
    }

    if (!dto.baseFields || typeof dto.baseFields !== 'object') {
      throw new BadRequestException('Applicant base fields are required.');
    }

    const { name, mobile, location, gender, email, age, dob } = dto.baseFields;
    const effectiveUserId = dto.userId || dto.baseFields.userId;

    // 1. Validate Base Fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestException('Valid full name (minimum 2 characters) is required.');
    }

    const normalizedMobile = String(mobile || '').trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      throw new BadRequestException('Valid 10-digit Indian mobile number is required.');
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      throw new BadRequestException('Location / City is required.');
    }

    if (!gender || typeof gender !== 'string' || !gender.trim()) {
      throw new BadRequestException('Gender is required.');
    }

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : undefined;
    if (cleanEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new BadRequestException('Invalid email address format.');
      }
    }

    // 2. Validate DOB & Age Consistency
    if (!dob) {
      throw new BadRequestException('Date of Birth is required.');
    }

    const parsedDob = new Date(dob);
    if (isNaN(parsedDob.getTime())) {
      throw new BadRequestException('Date of Birth must be a valid date.');
    }

    const now = new Date();
    if (parsedDob > now) {
      throw new BadRequestException('Date of Birth cannot be in the future.');
    }

    const numAge = Number(age);
    if (isNaN(numAge) || numAge <= 0 || numAge > 120) {
      throw new BadRequestException('Age must be a valid positive number.');
    }

    // Calculate approximate age from DOB
    const ageDiffMs = now.getTime() - parsedDob.getTime();
    const ageDate = new Date(ageDiffMs);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (Math.abs(calculatedAge - numAge) > 1) {
      throw new BadRequestException(
        `Age (${numAge}) is inconsistent with Date of Birth (${parsedDob.toISOString().slice(0, 10)} - approx ${calculatedAge} years).`,
      );
    }

    // 3. Verify Event & Registration Window
    const event = await this.db.event.findUnique({
      where: { id: dto.eventId },
    });

    if (!event || event.status === 'DRAFT' || event.status === 'CANCELLED') {
      throw new BadRequestException('Selected event is currently unavailable for registration.');
    }

    if (event.status !== 'ACTIVE' && event.registrationOpenDate && now < new Date(event.registrationOpenDate)) {
      throw new BadRequestException('Registration is not yet open for this event.');
    }

    if (event.registrationCloseDate && now > new Date(event.registrationCloseDate)) {
      throw new BadRequestException('Registration has closed for this event.');
    }

    // 4. Verify Category & Event Relationship
    const category = await this.db.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || category.eventId !== event.id || category.status !== 'ACTIVE') {
      throw new BadRequestException('Selected category is not available for this event.');
    }

    // 5. Duplicate Check & Idempotent Safe Handling
    const existingRegistrations = await this.db.registration.findMany({
      where: {
        eventId: event.id,
        categoryId: category.id,
      },
      select: {
        id: true,
        eventId: true,
        categoryId: true,
        baseFields: true,
        paymentStatus: true,
        contestantId: true,
        createdAt: true,
      },
    });

    const matching = existingRegistrations.find((r) => {
      const base = r.baseFields as any;
      if (!base) return false;
      if (effectiveUserId && base.userId === effectiveUserId) return true;
      if (cleanEmail && base.email === cleanEmail) return true;
      return base.mobile === normalizedMobile;
    });

    if (matching) {
      // Idempotent return of existing registration
      return {
        id: matching.id,
        referenceNumber: matching.id.slice(0, 8).toUpperCase(),
        eventId: event.id,
        eventName: event.name,
        categoryId: category.id,
        categoryName: category.name,
        applicantName: (matching.baseFields as any)?.name || name.trim(),
        mobile: normalizedMobile,
        paymentStatus: matching.paymentStatus,
        contestantId: matching.contestantId || null,
        status: 'REGISTRATION_RECEIVED' as const,
        message: 'Your registration has already been received. Payment processing will be available shortly.',
        createdAt: matching.createdAt.toISOString(),
      };
    }

    // 6. Prisma Transaction: Create UNPAID Registration & Audit Log
    return this.db.$transaction(async (tx) => {
      const sanitizedBaseFields = {
        userId: effectiveUserId,
        name: name.trim(),
        mobile: normalizedMobile,
        location: location.trim(),
        gender: gender.trim().toUpperCase(),
        email: cleanEmail,
        age: numAge,
        dob: parsedDob.toISOString().slice(0, 10),
        passwordHash: dto.baseFields.passwordHash,
      };

      const newRegistration = await tx.registration.create({
        data: {
          eventId: event.id,
          categoryId: category.id,
          baseFields: sanitizedBaseFields,
          customFields: dto.customFields || {},
          paymentStatus: 'UNPAID',
          contestantId: null,
        },
      });

      // Audit Log
      await this.audit.log({
        actorType: effectiveUserId ? 'USER' : 'SYSTEM',
        actorId: effectiveUserId || 'public-registration',
        action: 'REGISTRATION_CREATED',
        entity: 'Registration',
        entityId: newRegistration.id,
        before: null,
        after: {
          eventId: event.id,
          categoryId: category.id,
          paymentStatus: 'UNPAID',
          mobileMasked: `******${normalizedMobile.slice(-4)}`,
        },
        ipAddress,
      });

      // Trigger Registration Confirmation Email
      if (cleanEmail && this.mailService) {
        this.mailService
          .sendRegistrationConfirmationEmail(cleanEmail, {
            name: name.trim(),
            categoryName: category.name,
            eventName: event.name,
            registrationId: newRegistration.id,
          })
          .catch(() => {});
      }

      return {
        id: newRegistration.id,
        referenceNumber: newRegistration.id.slice(0, 8).toUpperCase(),
        eventId: event.id,
        eventName: event.name,
        categoryId: category.id,
        categoryName: category.name,
        applicantName: name.trim(),
        mobile: normalizedMobile,
        paymentStatus: 'UNPAID' as const,
        status: 'REGISTRATION_RECEIVED' as const,
        message: 'Registration submitted successfully. Payment status is PENDING verification.',
        createdAt: newRegistration.createdAt.toISOString(),
      };
    });
  }
}
