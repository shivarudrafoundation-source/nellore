import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class ContestantOwnershipGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    // Admins and Judges are authorized to bypass ownership checks
    if (user.role === 'ADMIN' || user.role === 'JUDGE') {
      return true;
    }

    if (user.role !== 'CONTESTANT') {
      throw new ForbiddenException('Access restricted to contestants.');
    }

    // Extract potential contestant ID and registration ID
    const contestantId =
      request.params.contestantId ||
      request.query.contestantId ||
      request.body.contestantId ||
      request.params.contestant_id ||
      request.query.contestant_id ||
      request.body.contestant_id;

    const registrationId =
      request.params.registrationId ||
      request.query.registrationId ||
      request.body.registrationId ||
      request.params.registration_id ||
      request.query.registration_id ||
      request.body.registration_id;

    const routeId = request.params.id;

    // 1. Direct match on contestant ID if explicitly provided
    if (contestantId && contestantId !== user.sub) {
      throw new ForbiddenException('Access denied. You do not own this contestant profile.');
    }

    // 2. Direct match on registration ID if explicitly provided
    if (registrationId) {
      const registration = await this.db.registration.findUnique({
        where: { id: registrationId },
      });

      if (!registration || registration.contestantId !== user.sub) {
        throw new ForbiddenException('Access denied. You do not own this registration.');
      }
    }

    // 3. Fallback check for route ID parameter (e.g. GET /contestant/:id or GET /registration/:id)
    if (routeId && !contestantId && !registrationId) {
      if (routeId === user.sub) {
        return true;
      }

      // Check if routeId is a registration belonging to this contestant
      const registration = await this.db.registration.findUnique({
        where: { id: routeId },
      });

      if (registration && registration.contestantId !== user.sub) {
        throw new ForbiddenException('Access denied. You do not own this registration.');
      }
    }

    return true;
  }
}
