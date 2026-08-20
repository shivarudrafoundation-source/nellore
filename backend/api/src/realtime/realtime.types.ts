export type ScoreRealtimeEventType = 'SCORE_SUBMITTED' | 'SCORE_UPDATED' | 'SCORE_LOCKED';
export type RoundRealtimeEventType = 'ROUND_ENDED';
export type EventRealtimeEventType = 'EVENT_FINALIZED' | 'RESULTS_PUBLISHED' | 'RESULTS_UNPUBLISHED';

export interface RoundEndedRealtimeEvent {
  eventId: string; // Unique message UUID for deduplication
  competitionEventId: string;
  categoryId: string;
  categoryName: string;
  roundId: string;
  roundName: string;
  roundMaxMarks: number;
  totalContestants: number;
  standings: Array<{
    rank: number;
    contestantId: string;
    score: number;
    maxMarks: number;
  }>;
  type: 'ROUND_ENDED';
  timestamp: string;
}

export interface EventFinalizedRealtimeEvent {
  eventId: string; // Unique message UUID
  competitionEventId: string;
  competitionEventName?: string;
  totalCategories: number;
  winners: Array<{
    categoryId: string;
    categoryName: string;
    categoryCode: string;
    winnerContestantId: string;
    winnerFinalScore: number;
    winnerMaxMarks: number;
    rank: number;
  }>;
  allCategoryRankings?: Record<string, Array<{
    rank: number;
    contestantId: string;
    category: string;
    categoryCode: string;
    finalScore: number;
    maxMarks: number;
  }>>;
  type: 'EVENT_FINALIZED';
  timestamp: string;
}

export interface ResultsPublishedRealtimeEvent {
  eventId: string;
  competitionEventId: string;
  categoryId?: string | null;
  isPublished: true;
  winners?: Array<{
    categoryId: string;
    categoryName: string;
    categoryCode: string;
    winnerContestantId: string;
    winnerFinalScore: number;
    winnerMaxMarks: number;
    rank: number;
  }>;
  type: 'RESULTS_PUBLISHED';
  timestamp: string;
}

export interface ResultsUnpublishedRealtimeEvent {
  eventId: string;
  competitionEventId: string;
  categoryId?: string | null;
  isPublished: false;
  type: 'RESULTS_UNPUBLISHED';
  timestamp: string;
}

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
  event: (competitionEventId: string) => `event:${competitionEventId}`,
};

export const REDIS_REALTIME_CHANNELS = {
  SCORES: 'srf:realtime:scores',
  ROUNDS: 'srf:realtime:rounds',
  EVENTS: 'srf:realtime:events',
};

export interface OutboxScoreEvent {
  eventId: string;
  eventType: ScoreRealtimeEventType | RoundRealtimeEventType | EventRealtimeEventType;
  aggregateType: string;
  aggregateId: string;
  payload: SafeScoreRealtimeEvent | RoundEndedRealtimeEvent | EventFinalizedRealtimeEvent | ResultsPublishedRealtimeEvent | ResultsUnpublishedRealtimeEvent;
  createdAt: string;
  publishedAt: string | null;
  attemptCount: number;
  lastError: string | null;
}
