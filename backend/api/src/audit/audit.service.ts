import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Recursively sanitizes an object to remove or mask sensitive information.
   */
  private sanitize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      const sensitiveKeys = new Set([
        'password',
        'passwordhash',
        'password_hash',
        'totpsecret',
        'totp_secret',
        'secret',
        'token',
        'otp',
        'access_token',
        'refresh_token',
        'cookie',
        'authorization',
      ]);

      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.has(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Log security, auth, and state changes to the database
   */
  async log(params: {
    actorType: 'ADMIN' | 'JUDGE' | 'CONTESTANT' | 'SYSTEM';
    actorId: string;
    action:
      | 'ADMIN_LOGIN'
      | 'JUDGE_LOGIN'
      | 'PASSWORD_RESET'
      | 'OTP_VERIFIED'
      | 'REGISTRATION_CREATED'
      | 'SCORE_SUBMITTED'
      | 'SCORE_UNLOCKED'
      | 'EVENT_CREATED'
      | 'EVENT_UPDATED'
      | 'EVENT_DELETED'
      | 'CATEGORY_CREATED'
      | 'CATEGORY_UPDATED'
      | 'CATEGORY_DELETED'
      | 'ROUND_CREATED'
      | 'ROUND_UPDATED'
      | 'ROUND_DELETED'
      | 'REGISTRATION_UPDATED'
      | 'CONTESTANT_CREATED'
      | 'CONTESTANT_UPDATED'
      | 'PAYMENT_VERIFIED'
      | 'JUDGE_CREATED'
      | 'JUDGE_UPDATED'
      | 'JUDGE_ASSIGNED'
      | 'JUDGE_DISABLED'
      | 'JUDGE_ENABLED'
      | 'JUDGE_PASSWORD_RESET'
      | 'SCORE_UPDATED'
      | 'SCORE_LOCKED'
      | 'PDF_UPLOADED'
      | 'PDF_DELETED'
      | 'CONTESTANT_LOGIN'
      | 'CONTESTANT_LOGOUT'
      | 'CONTESTANT_OTP_REQUESTED'
      | 'RESULT_PUBLISHED'
      | 'RESULT_UNPUBLISHED'
      | 'ANNOUNCEMENT_CREATED'
      | 'ANNOUNCEMENT_UPDATED'
      | 'ANNOUNCEMENT_DELETED';
    entity: string;
    entityId?: string | null;
    before?: any;
    after?: any;
    ipAddress?: string | null;
  }) {
    const sanitizedBefore = params.before ? this.sanitize(params.before) : null;
    const sanitizedAfter = params.after ? this.sanitize(params.after) : null;

    return this.db.auditLog.create({
      data: {
        actorType: params.actorType,
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        before: sanitizedBefore,
        after: sanitizedAfter,
        ipAddress: params.ipAddress || null,
      },
    });
  }

  async findAll(query: { page?: number; limit?: number; action?: string; entity?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;

    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.auditLog.count({ where }),
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
}
