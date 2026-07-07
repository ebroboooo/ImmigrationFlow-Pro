import type { ImmigrationDocumentType } from './DocumentClassification';

import type { GeminiDocumentAnalysis } from './GeminiAnalysis';

export type ExtractionMethod = 'pattern' | 'llm' | 'hybrid' | 'manual' | 'heuristic';

export type FieldValidationStatus = 'valid' | 'invalid' | 'warning' | 'unverified';

export type FieldReviewStatus = 'pending' | 'approved' | 'rejected';

export interface FieldValidation {
  status: FieldValidationStatus;
  message?: string;
}

export interface IntelligentFieldValue<T = string> {
  value: T;
  confidence: number;
  sourceSnippet?: string;
  extractionMethod: ExtractionMethod;
  ocrConfidence?: number;
  llmConfidence?: number;
  validation?: FieldValidation;
  reviewStatus?: FieldReviewStatus;
}

export type PersonRole =
  | 'Client'
  | 'Beneficiary'
  | 'Petitioner'
  | 'Sponsor'
  | 'Attorney'
  | 'Interpreter'
  | 'Translator'
  | 'Employer'
  | 'Dependent'
  | 'Guardian'
  | 'Other';

export interface PersonEntity {
  id: string;
  role: PersonRole;
  name?: IntelligentFieldValue;
  dateOfBirth?: IntelligentFieldValue;
  nationality?: IntelligentFieldValue;
  phone?: IntelligentFieldValue;
  email?: IntelligentFieldValue;
  address?: IntelligentFieldValue;
  relationship?: IntelligentFieldValue;
  confidence: number;
}

export interface CaseEntity {
  receiptNumber?: IntelligentFieldValue;
  aNumber?: IntelligentFieldValue;
  caseNumber?: IntelligentFieldValue;
  uscisOnlineAccountNumber?: IntelligentFieldValue;
  priorityDate?: IntelligentFieldValue;
  caseCategory?: IntelligentFieldValue;
  visaCategory?: IntelligentFieldValue;
  currentStatus?: IntelligentFieldValue;
  deadlines?: IntelligentFieldValue[];
  rfeDates?: IntelligentFieldValue[];
  interviewDates?: IntelligentFieldValue[];
  biometricsDates?: IntelligentFieldValue[];
  expirationDates?: IntelligentFieldValue[];
  serviceCenter?: IntelligentFieldValue;
  office?: IntelligentFieldValue;
}

export interface DocumentTypeDetection {
  documentType: ImmigrationDocumentType;
  confidence: number;
  reason: string;
  source: 'heuristic' | 'llm' | 'manual';
  matchedSignals?: string[];
}

export interface DocumentSchemaExtraction {
  documentType: ImmigrationDocumentType;
  fields: Record<string, IntelligentFieldValue | null>;
}

export type CRMMatchAction = 'update_existing_case' | 'create_new_case' | 'merge' | 'manual_review';

export interface CRMMatchCandidate {
  entityType: 'client' | 'case';
  entityId: string;
  entityName: string;
  matchedOn: string[];
  similarity: number;
}

export interface CRMMatchSuggestion {
  action: CRMMatchAction;
  confidence: number;
  reason: string;
  candidates: CRMMatchCandidate[];
  neverAutoApply: true;
}

export interface IntelligenceWarning {
  field?: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export type SmartRecommendationCategory =
  | 'missing_document'
  | 'appointment'
  | 'deadline'
  | 'rfe_risk'
  | 'legal_action'
  | 'email'
  | 'calendar'
  | 'task';

export interface SmartIntelligenceRecommendation {
  category: SmartRecommendationCategory;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface DocumentIntelligenceResult {
  detection: DocumentTypeDetection;
  schemaExtraction: DocumentSchemaExtraction;
  persons: PersonEntity[];
  caseEntity: CaseEntity;
  warnings: IntelligenceWarning[];
  missingInformation: string[];
  smartRecommendations: SmartIntelligenceRecommendation[];
  crmMatching: CRMMatchSuggestion;
  overallConfidence: number;
  promptVersion?: string;
}

/** Raw parse output from LLM provider — enriched by documentIntelligenceService. */
export interface ParsedIntelligencePayload {
  intelligence: Partial<DocumentIntelligenceResult>;
  geminiAnalysis: GeminiDocumentAnalysis;
}

export function emptyCaseEntity(): CaseEntity {
  return {};
}

export function createIntelligentField(
  value: string,
  confidence: number,
  method: ExtractionMethod,
  extras?: Partial<Omit<IntelligentFieldValue, 'value' | 'confidence' | 'extractionMethod'>>,
): IntelligentFieldValue {
  return {
    value,
    confidence: Math.min(1, Math.max(0, confidence)),
    extractionMethod: method,
    reviewStatus: 'pending',
    ...extras,
  };
}
