import type { RiskLevel } from './GeminiAnalysis';

export type CopilotScopeType = 'client' | 'case';

export interface CopilotScope {
  type: CopilotScopeType;
  clientId: string;
  caseId?: string;
}

export interface CaseContextClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  nationality?: string;
  immigrationStatus?: string;
  aNumber?: string;
  passportNumber?: string;
  notes?: string;
  updatedAt: string;
}

export interface CaseContextCase {
  id: string;
  name: string;
  caseType: string;
  stage: string;
  uscisReceiptNumber?: string;
  filingDate?: string;
  filingDeadline?: string;
  currentStatus?: string;
  assignedAttorney?: string;
  notes?: string;
  updatedAt: string;
}

export interface CaseContextDocument {
  id: string;
  name: string;
  category: string;
  status: string;
  caseId?: string;
  createdAt: string;
}

export interface CaseContextTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  type: string;
}

export interface CaseContextDeadline {
  id: string;
  title: string;
  type: string;
  date: string;
  status: string;
}

export interface CaseContextAppointment {
  id: string;
  title: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
}

export interface CaseContextInvoice {
  id: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  type: string;
}

export interface CaseContextNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface CaseContextActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface CaseContextIntakeSession {
  id: string;
  fileName: string;
  status: string;
  documentType?: string;
  summary?: string;
  riskLevel?: RiskLevel;
  createdAt: string;
}

export interface CaseContextTimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: string;
}

export interface CaseContext {
  scope: CopilotScope;
  tenantId: string;
  fingerprint: string;
  builtAt: string;
  client: CaseContextClient;
  cases: CaseContextCase[];
  documents: CaseContextDocument[];
  tasks: CaseContextTask[];
  deadlines: CaseContextDeadline[];
  appointments: CaseContextAppointment[];
  invoices: CaseContextInvoice[];
  notes: CaseContextNote[];
  activities: CaseContextActivity[];
  intakeSessions: CaseContextIntakeSession[];
  timelineEvents: CaseContextTimelineEvent[];
  billingSummary: {
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
    overdueCount: number;
  };
}
