import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getStats() {
    // 1. Fetch counts batch
    const [
      activeEventCount,
      upcomingEventCount,
      totalRegistrations,
      paidRegistrations,
      contestantCount,
      judgeCount,
    ] = await Promise.all([
      this.db.event.count({ where: { status: 'ACTIVE' } }),
      this.db.event.count({ where: { status: 'UPCOMING' } }),
      this.db.registration.count(),
      this.db.registration.count({ where: { paymentStatus: 'PAID' } }),
      this.db.contestant.count(),
      this.db.judgeAccount.count(),
    ]);

    // 2. Fetch recent listings batch
    const [recentRegistrations, recentAuditLogs, upcomingEvents] = await Promise.all([
      this.db.registration.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          baseFields: true,
          paymentStatus: true,
          createdAt: true,
          event: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
      this.db.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          actorType: true,
          action: true,
          entity: true,
          entityId: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      this.db.event.findMany({
        where: { status: 'UPCOMING' },
        take: 5,
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      }),
    ]);

    return {
      counts: {
        activeEvents: activeEventCount,
        upcomingEvents: upcomingEventCount,
        totalRegistrations,
        paidRegistrations,
        contestants: contestantCount,
        judges: judgeCount,
      },
      recentRegistrations,
      recentAuditLogs,
      upcomingEvents,
    };
  }
}
