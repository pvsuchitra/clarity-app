import { Timestamp } from 'firebase/firestore';

export type EntryType = 'habit' | 'journal' | 'summary' | 'retrospective';

export type TemplateId = 'habit-tracking' | 'journal-reflection' | 'intake-router' | 'retrospective-summary';

export interface JournalEntry {
  id: string;
  content: string;
  type: EntryType;
  sourceSessionId: string;
  createdAt: Timestamp | any;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface UserUsage {
  dailySaveCount: number;
  dailyGeminiCallCount: number;
  dailyRetrospectiveCount: number;
  lastResetDate: string;
}

export interface SessionDoc {
  sessionId: string;
  turnCount: number;
  templateId: TemplateId;
  startedAt: string;
}

export type Theme = 'light' | 'dark';

export interface StartSessionOptions {
  initialUserMessage?: string;
  openingModelGreeting?: string;
  starterTitle?: string;
}
