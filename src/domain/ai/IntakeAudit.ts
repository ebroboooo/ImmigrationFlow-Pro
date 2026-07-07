export type IntakeAuditEvent =
  | 'session_created'
  | 'pipeline_stage'
  | 'classification'
  | 'extraction'
  | 'recommendations_generated'
  | 'review_edited'
  | 'approved'
  | 'rejected'
  | 'automation_executed';

export interface IntakeAuditRecord {
  id: string;
  event: IntakeAuditEvent;
  timestamp: string;
  userId?: string;
  providerId?: string;
  confidence?: number;
  documentVersion?: string;
  stage?: string;
  details?: string;
  automationActions?: string[];
}
