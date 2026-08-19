import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class ScoreLockGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    // 1. Extract score ID from route params, query, or body
    const scoreId =
      request.params.scoreId ||
      request.query.scoreId ||
      request.body.scoreId ||
      request.params.id ||
      request.query.id ||
      request.body.id;

    // 2. Extract unique identifier fields (contestantId, roundId, judgeId) to check if we are overwriting an existing score
    const contestantId =
      request.body.contestantId || request.body.contestant_id ||
      request.query.contestantId || request.query.contestant_id;
      
    const roundId =
      request.body.roundId || request.body.round_id ||
      request.query.roundId || request.query.round_id;

    // Judge ID is either in body/query or retrieved from the logged-in judge's session
    const judgeId =
      request.body.judgeId ||
      request.query.judgeId ||
      request.body.judge_id ||
      request.query.judge_id ||
      (user && user.role === 'JUDGE' ? user.sub : null);

    let existingScore = null;

    if (scoreId) {
      // Find score by ID (make sure it's a UUID/string)
      existingScore = await this.db.score.findUnique({
        where: { id: scoreId },
      });
    } else if (contestantId && roundId && judgeId) {
      // Find score by the unique contestant-round-judge combination
      existingScore = await this.db.score.findUnique({
        where: {
          contestantId_roundId_judgeId: {
            contestantId,
            roundId,
            judgeId,
          },
        },
      });
    }

    if (existingScore && existingScore.locked) {
      throw new ForbiddenException('Access denied. This score is locked and cannot be edited or overwritten.');
    }

    return true;
  }
}
