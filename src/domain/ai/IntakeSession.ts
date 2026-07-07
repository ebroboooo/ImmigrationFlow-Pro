import type { ClassificationResult } from './DocumentClassification';
import type { ExtractedImmigrationFields } from './ExtractedFields';
import type { IntakeRecommendations } from './IntakeRecommendations';
import type { AutomationAction, AutomationExecutionResult } from './AutomationPlan';
import type { IntakeAuditRecord } from './IntakeAudit';
import type { AIUsageMetrics } from './AIUsage';
import type { IntakeOCRMetadata } from './OCRUsage';
import type { DocumentIntelligenceResult } from './DocumentIntelligence';
import type { RiskLevel } from './GeminiAnalysis';

export type IntakeSessionStatus =
  | 'uploaded'
  | 'validating'
  | 'extracting_text'
  | 'ocr_processing'
  | 'ocr_pending'
  | 'classifying'
  | 'analyzing'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'automation_complete'
  | 'failed';

export type PipelineStage =
  | 'validation'
  | 'ocr'
  | 'text_extraction'
  | 'classification'
  | 'ai_extraction'
  | 'recommendations'
  | 'human_review'
  | 'automation';

export interface IntakeFileMeta {
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
}

export interface IntakeAIMetadata {
  providerId: string;
  model?: string;
  promptVersion?: string;
  analysisComplete: boolean;
  overallConfidence: number;
  riskLevel?: RiskLevel;
  warnings: string[];
  usage?: AIUsageMetrics;
}

export interface IntakeSession {
  id: string;
  tenantId: string;
  file: IntakeFileMeta;
  status: IntakeSessionStatus;
  currentStage: PipelineStage;
  extractedText: string;
  ocrRequired: boolean;
  ocrAvailable: boolean;
  classification: ClassificationResult | null;
  extractedFields: ExtractedImmigrationFields;
  recommendations: IntakeRecommendations;
  automationActions: AutomationAction[];
  audit: IntakeAuditRecord[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewDecision?: 'approved' | 'rejected';
  automationResults?: AutomationExecutionResult[];
  aiMetadata?: IntakeAIMetadata;
  ocrMetadata?: IntakeOCRMetadata;
  documentIntelligence?: DocumentIntelligenceResult;
}
