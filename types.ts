export interface Student {
  id: string;
  name: string;
}

export type CheckStatus = 'present' | 'absent' | 'pending';

export interface CheckRecord {
  check1: CheckStatus;
  check2: CheckStatus;
  check3: CheckStatus;
}

export interface SessionData {
  sessionId: string;
  date: string;
  records: Record<string, CheckRecord>; // Key is student ID
  completedChecks: number; // 0, 1, 2, or 3
}

export type AppView = 'roster' | 'active-session' | 'summary';
