import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getStats() {
    // Execute all independent count queries in parallel for performance
    const [
      activeEventCount,
      upcomingEventCount,
      totalRegistrations,
      paidRegistrations,
      contestantCount,
      judgeCount,
      recentRegistrations,
      recentAuditLogs,
      upcomingEvents,
    ] = await Promise.all([
      // Active events
      this.db.event.count({
        where: { status: 'ACTIVE' },
      }),

      // Upcoming events
      this.db.event.count({
        where: { status: 'UPCOMING' },
      }),

      // Total registrations
      this.db.registration.count(),

      // Paid registrations
      this.db.registration.count({
        where: { paymentStatus: 'PAID' },
      }),

      // Total contestants
      this.db.contestant.count(),

      // Total judges
      this.db.judgeAccount.count(),

      // Recent 5 registrations with event and category names
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

      // Recent 5 audit logs (sanitized - no secrets)
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

      // Upcoming 5 events
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
