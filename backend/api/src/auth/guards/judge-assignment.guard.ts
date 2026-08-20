import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class JudgeAssignmentGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    // Admins have full access and bypass judge assignment restrictions
    if (user.role === 'ADMIN') {
      return true;
    }

    if (user.role !== 'JUDGE') {
      throw new ForbiddenException('Access restricted to assigned judges.');
    }

    // Re-verify assignment details directly from the database on every request
    const judge = await this.db.judgeAccount.findUnique({
      where: { id: user.sub },
    });

    if (!judge) {
      throw new UnauthorizedException('Judge account not found.');
    }

    if (!judge.isActive) {
      throw new ForbiddenException('Judge account is disabled. Please contact administrator.');
    }

    // Extract eventId, categoryId, roundId from params, query, or body
    const eventId =
      request.params.eventId ||
      request.query.eventId ||
      request.body.eventId ||
      request.params.event_id ||
      request.query.event_id ||
      request.body.event_id;

    const categoryId =
      request.params.categoryId ||
      request.query.categoryId ||
      request.body.categoryId ||
      request.params.category_id ||
      request.query.category_id ||
      request.body.category_id;

    const roundId =
      request.params.roundId ||
      request.query.roundId ||
      request.body.roundId ||
      request.params.round_id ||
      request.query.round_id ||
      request.body.round_id;

    // Enforce matching event if provided
    if (eventId && judge.assignedEventId !== eventId) {
      throw new ForbiddenException(`Access denied. Judge is not assigned to event '${eventId}'.`);
    }

    // Enforce matching category if provided
    if (categoryId && judge.assignedCategoryId !== categoryId) {
      throw new ForbiddenException(`Access denied. Judge is not assigned to category '${categoryId}'.`);
    }

    // Enforce matching round if provided
    if (roundId && judge.assignedRoundId !== roundId) {
      throw new ForbiddenException(`Access denied. Judge is not assigned to round '${roundId}'.`);
    }

    // Update request.user with database-backed assignment properties (avoids stale token data)
    user.assignedEventId = judge.assignedEventId;
    user.assignedCategoryId = judge.assignedCategoryId;
    user.assignedRoundId = judge.assignedRoundId;

    return true;
  }
}
