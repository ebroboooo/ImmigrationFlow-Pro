import type { RiskLevel } from './GeminiAnalysis';

export interface CaseRiskItem {
  category: string;
  severity: RiskLevel;
  message: string;
  recommendation: string;
}

export interface CaseCopilotEmailDraft {
  type: 'client_update' | 'missing_docs' | 'appointment_reminder' | 'interview_prep' | 'follow_up';
  subject: string;
  body: string;
}

export interface CaseCopilotInsights {
  executiveSummary: string;
  currentStatus: string;
  timelineSummary: string;
  timelineNarrative: string;
  missingDocuments: string[];
  upcomingDeadlines: Array<{ title: string; date: string; type: string }>;
  openTasks: Array<{ title: string; priority: string; dueDate?: string }>;
  riskLevel: RiskLevel;
  riskItems: CaseRiskItem[];
  suggestedNextActions: string[];
  recentAiAnalyses: Array<{ fileName: string; documentType: string; date: string; summary?: string }>;
  providerId: string;
  fromCache: boolean;
  generatedAt: string;
  disclaimer: string;
}

export interface CaseCopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const CASE_COPILOT_DISCLAIMER =
  'AI-generated insights are advisory only and do not constitute legal advice. Verify all information before acting.';
