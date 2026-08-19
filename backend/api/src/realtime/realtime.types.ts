export type ScoreRealtimeEventType = 'SCORE_SUBMITTED' | 'SCORE_UPDATED' | 'SCORE_LOCKED';

export interface SafeScoreRealtimeEvent {
  eventId: string; // Unique message UUID for client deduplication
  competitionEventId: string;
  categoryId: string;
  categoryCode?: string;
  categoryName?: string;
  roundId: string;
  roundName?: string;
  roundMaxMarks?: number;
  contestantId: string;
  judgeId?: string;
  judgeName?: string;
  subScores: Record<string, number>;
  totalScore: number;
  status: 'DRAFT' | 'LOCKED';
  type: ScoreRealtimeEventType;
  timestamp: string;
}

export interface PublicStageScoreEvent {
  eventId: string; // Unique message UUID
  competitionEventId: string;
  categoryId: string;
  categoryName?: string;
  roundId: string;
  roundName?: string;
  roundMaxMarks?: number;
  contestantId: string;
  totalScore: number;
  status: 'DRAFT' | 'LOCKED';
  type: ScoreRealtimeEventType;
  timestamp: string;
}

export const RealtimeRooms = {
  admin: (competitionEventId: string) => `admin:${competitionEventId}`,
  stage: (competitionEventId: string) => `stage:${competitionEventId}`,
  round: (roundId: string) => `round:${roundId}`,
};

export const REDIS_REALTIME_CHANNELS = {
  SCORES: 'srf:realtime:scores',
};

export interface OutboxScoreEvent {
  eventId: string;
  eventType: ScoreRealtimeEventType;
  aggregateType: string;
  aggregateId: string;
  payload: SafeScoreRealtimeEvent;
  createdAt: string;
  publishedAt: string | null;
  attemptCount: number;
  lastError: string | null;
}
