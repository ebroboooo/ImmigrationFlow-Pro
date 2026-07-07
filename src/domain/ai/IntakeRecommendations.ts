import type { ExtractedImmigrationFields } from './ExtractedFields';
import type { RiskLevel } from './GeminiAnalysis';

export interface SuggestedTask {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  responsibleRole?: 'Attorney' | 'Paralegal' | 'Client';
  urgency?: string;
  selected: boolean;
}

export interface SuggestedCalendarEvent {
  id: string;
  title: string;
  type: 'Interview' | 'Biometrics' | 'Deadline' | 'Follow-up' | 'Document Request' | 'Client Meeting';
  start: string;
  end?: string;
  location?: string;
  notes?: string;
  selected: boolean;
}

export interface SuggestedDeadline {
  id: string;
  title: string;
  type: string;
  date: string;
  selected: boolean;
}

export interface SuggestedEmailDraft {
  subject: string;
  body: string;
  to?: string;
  approved: boolean;
}

export interface IntakeRecommendations {
  caseSummary: string;
  plainEnglishSummary?: string;
  attorneySummary?: string;
  clientSummary?: string;
  nextSteps: string[];
  suggestedTasks: SuggestedTask[];
  suggestedCalendarEvents: SuggestedCalendarEvent[];
  suggestedDeadlines: SuggestedDeadline[];
  suggestedEmail: SuggestedEmailDraft;
  suggestedInternalNotes: string;
  riskIndicators: string[];
  riskLevel?: RiskLevel;
  warnings?: string[];
  missingInformation: string[];
  requiredDocuments: string[];
  potentialFollowUps: string[];
}

export function emptyRecommendations(): IntakeRecommendations {
  return {
    caseSummary: '',
    nextSteps: [],
    suggestedTasks: [],
    suggestedCalendarEvents: [],
    suggestedDeadlines: [],
    suggestedEmail: { subject: '', body: '', approved: false },
    suggestedInternalNotes: '',
    riskIndicators: [],
    missingInformation: [],
    requiredDocuments: [],
    potentialFollowUps: [],
  };
}

export type RecommendationInput = {
  fields: ExtractedImmigrationFields;
  documentType: string;
  rawText: string;
};
