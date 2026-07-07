import type { SuggestedCalendarEvent, SuggestedDeadline, SuggestedEmailDraft, SuggestedTask } from './IntakeRecommendations';
import type { ImmigrationDocumentType } from './DocumentClassification';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GeminiSummaries {
  plainEnglish: string;
  attorney: string;
  client: string;
  internalNote: string;
}

export interface GeminiDocumentAnalysis {
  classification: {
    documentType: ImmigrationDocumentType;
    confidence: number;
  };
  fields: Record<string, { value: string; confidence: number } | null>;
  summaries: GeminiSummaries;
  tasks: Array<Omit<SuggestedTask, 'id' | 'selected'>>;
  calendarEvents: Array<Omit<SuggestedCalendarEvent, 'id' | 'selected'>>;
  deadlines: Array<Omit<SuggestedDeadline, 'id' | 'selected'>>;
  email: Omit<SuggestedEmailDraft, 'approved'>;
  missingDocuments: string[];
  requestedEvidence: string[];
  recommendedNextSteps: string[];
  warnings: string[];
  riskLevel: RiskLevel;
  overallConfidence: number;
}
