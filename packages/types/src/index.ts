export type UserRole = 'PUBLIC_VISITOR' | 'ADMIN' | 'JUDGE' | 'CONTESTANT';

export interface Event {
  id: string;
  name: string;
  code: string;
  location: string;
  dates: string;
  logo: string | null;
  description: string;
  status: 'UPCOMING' | 'ONGOING' | 'PAST';
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  eventId: string;
  name: string; // e.g. Kids, Teen, Miss, Ms, Mr
  code: string; // e.g. K, T, MS, MRS, MR
  createdAt: Date;
  updatedAt: Date;
}

export interface Round {
  id: string;
  categoryId: string;
  name: string; // e.g. Traditional, Discipline, Talent, Western
  maxMarks: number;
  scoredBy: 'admin' | 'judge';
  day: number;
  subCriteria: SubCriterion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SubCriterion {
  name: string;
  maxMarks: number;
}

export interface Registration {
  id: string;
  eventId: string;
  categoryId: string;
  baseFields: {
    name: string;
    mobile: string;
    location: string;
    gender: string;
    email: string;
    age: number;
    dob: string;
  };
  customFields: Record<string, string | number | boolean>;
  paymentStatus: 'PAID' | 'UNPAID';
  contestantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contestant {
  id: string; // e.g. SRF-NLR-K-0003
  registrationId: string;
  mobile: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Score {
  id: string;
  contestantId: string;
  roundId: string;
  judgeId: string | null; // null if scored by admin
  subScores: Record<string, number>;
  value: number; // calculated total score or direct mark
  submittedAt: Date;
  locked: boolean;
}

export interface JudgeAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  assignedEventId: string;
  assignedCategoryId: string;
  assignedRoundId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

// Scans / leaderboard structures
export interface LeaderboardEntry {
  rank: number;
  contestantId: string;
  totalScore: number;
  roundScores: Record<string, number>; // roundName -> score
}
