export interface JwtPayload {
  sub: string;
  role: 'ADMIN' | 'JUDGE' | 'CONTESTANT';
  email?: string;
  mobile?: string;
  eventId?: string;
  assignedEventId?: string;
  assignedCategoryId?: string;
  assignedRoundId?: string;
}
