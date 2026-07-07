export type MigrationWizardStep =
  | 'upload_spreadsheets'
  | 'upload_documents'
  | 'analyze'
  | 'column_mapping'
  | 'preview'
  | 'duplicates'
  | 'options'
  | 'import'
  | 'report';

export const MIGRATION_WIZARD_STEPS: MigrationWizardStep[] = [
  'upload_spreadsheets',
  'upload_documents',
  'analyze',
  'column_mapping',
  'preview',
  'duplicates',
  'options',
  'import',
  'report',
];

export const MIGRATION_STEP_LABELS: Record<MigrationWizardStep, string> = {
  upload_spreadsheets: 'Upload Spreadsheets',
  upload_documents: 'Upload Documents',
  analyze: 'AI Analysis',
  column_mapping: 'Column Mapping',
  preview: 'Preview Data',
  duplicates: 'Resolve Duplicates',
  options: 'Import Options',
  import: 'Run Migration',
  report: 'Import Report',
};

export type MigrationFieldKey =
  | 'clientName'
  | 'beneficiary'
  | 'petitioner'
  | 'attorney'
  | 'email'
  | 'phone'
  | 'receiptNumber'
  | 'caseNumber'
  | 'aNumber'
  | 'priorityDate'
  | 'interviewDate'
  | 'biometricsDate'
  | 'filingDate'
  | 'status'
  | 'caseType'
  | 'visaCategory'
  | 'country'
  | 'address'
  | 'notes'
  | 'invoiceAmount'
  | 'balance'
  | 'payment'
  | 'appointmentDate'
  | 'deadlineDate'
  | 'taskTitle'
  | 'documentName'
  | 'leadName'
  | 'company'
  | 'ignore'
  | 'unknown';

export type MigrationEntityType =
  | 'client'
  | 'lead'
  | 'case'
  | 'task'
  | 'deadline'
  | 'appointment'
  | 'document'
  | 'invoice'
  | 'note'
  | 'activity';

export type DuplicateAction = 'update_existing' | 'merge' | 'skip' | 'create_new';

export interface ParsedSpreadsheet {
  id: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  sourceFormat: 'xlsx' | 'csv' | 'tsv' | 'unknown';
}

export interface ColumnMappingEntry {
  sourceColumn: string;
  targetField: MigrationFieldKey;
  confidence: number;
  reason: string;
  manualOverride?: boolean;
}

export interface SpreadsheetColumnMapping {
  spreadsheetId: string;
  sheetName: string;
  mappings: ColumnMappingEntry[];
}

export interface ZipDocumentEntry {
  id: string;
  path: string;
  fileName: string;
  size: number;
  blob: Blob;
  detectedType?: string;
  suggestedClientName?: string;
  suggestedReceiptNumber?: string;
  suggestedANumber?: string;
  linkConfidence: number;
  linkedEntityType?: 'client' | 'case' | 'lead';
  linkedEntityKey?: string;
  manualOverride?: boolean;
}

export interface MigrationValidationIssue {
  rowIndex?: number;
  field?: string;
  entityType?: MigrationEntityType;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PreviewClient {
  key: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  nationality?: string;
  aNumber?: string;
  sourceRow: number;
  spreadsheetId: string;
  isDuplicate?: boolean;
  duplicateAction?: DuplicateAction;
  existingId?: string;
}

export interface PreviewCase {
  key: string;
  name: string;
  clientKey: string;
  caseType?: string;
  stage?: string;
  uscisReceiptNumber?: string;
  priorityDate?: string;
  currentStatus?: string;
  assignedAttorney?: string;
  sourceRow: number;
  spreadsheetId: string;
  isDuplicate?: boolean;
  duplicateAction?: DuplicateAction;
  existingId?: string;
}

export interface PreviewLead {
  key: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  sourceRow: number;
  spreadsheetId: string;
  isDuplicate?: boolean;
  duplicateAction?: DuplicateAction;
  existingId?: string;
}

export interface PreviewTask {
  key: string;
  title: string;
  description?: string;
  dueDate?: string;
  relatedClientKey?: string;
  relatedCaseKey?: string;
  sourceRow: number;
  spreadsheetId: string;
}

export interface PreviewDeadline {
  key: string;
  title: string;
  date: string;
  type?: string;
  relatedClientKey?: string;
  relatedCaseKey?: string;
  sourceRow: number;
  spreadsheetId: string;
}

export interface PreviewAppointment {
  key: string;
  title: string;
  startTime: string;
  relatedClientKey?: string;
  relatedCaseKey?: string;
  sourceRow: number;
  spreadsheetId: string;
}

export interface PreviewInvoice {
  key: string;
  clientKey: string;
  amount: number;
  paidAmount?: number;
  dueDate?: string;
  sourceRow: number;
  spreadsheetId: string;
}

export interface PreviewDocument {
  key: string;
  name: string;
  clientKey?: string;
  caseKey?: string;
  category?: string;
  zipEntryId?: string;
  sourceRow?: number;
  spreadsheetId?: string;
}

export interface DuplicateCandidate {
  id: string;
  entityType: MigrationEntityType;
  previewKey: string;
  previewLabel: string;
  matchedOn: string[];
  similarity: number;
  existingId?: string;
  existingLabel?: string;
  suggestedAction: DuplicateAction;
  resolvedAction?: DuplicateAction;
}

export interface MigrationPreview {
  clients: PreviewClient[];
  leads: PreviewLead[];
  cases: PreviewCase[];
  tasks: PreviewTask[];
  deadlines: PreviewDeadline[];
  appointments: PreviewAppointment[];
  invoices: PreviewInvoice[];
  documents: PreviewDocument[];
  duplicates: DuplicateCandidate[];
  warnings: MigrationValidationIssue[];
  errors: MigrationValidationIssue[];
  estimatedSeconds: number;
  totalRows: number;
}

export interface ImportOptions {
  createClients: boolean;
  createLeads: boolean;
  createCases: boolean;
  createTasks: boolean;
  createDeadlines: boolean;
  createAppointments: boolean;
  createInvoices: boolean;
  createDocuments: boolean;
  createNotes: boolean;
  createActivities: boolean;
  skipDuplicates: boolean;
  updateExisting: boolean;
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  createClients: true,
  createLeads: true,
  createCases: true,
  createTasks: true,
  createDeadlines: true,
  createAppointments: true,
  createInvoices: true,
  createDocuments: true,
  createNotes: true,
  createActivities: true,
  skipDuplicates: false,
  updateExisting: false,
};

export interface ImportProgress {
  phase: 'preparing' | 'clients' | 'leads' | 'cases' | 'tasks' | 'deadlines' | 'appointments' | 'invoices' | 'documents' | 'complete' | 'failed' | 'cancelled';
  processed: number;
  total: number;
  message: string;
  percent: number;
}

export interface ImportReportEntry {
  entityType: MigrationEntityType;
  action: 'imported' | 'skipped' | 'merged' | 'updated' | 'error';
  label: string;
  message?: string;
}

export interface ImportReport {
  startedAt: string;
  completedAt: string;
  success: boolean;
  imported: number;
  skipped: number;
  merged: number;
  updated: number;
  errors: number;
  warnings: number;
  missingDocuments: string[];
  duplicateSummary: string[];
  entries: ImportReportEntry[];
  rollbackPerformed?: boolean;
}

export interface MigrationSession {
  id: string;
  tenantId: string;
  userId: string;
  currentStep: MigrationWizardStep;
  spreadsheets: ParsedSpreadsheet[];
  zipDocuments: ZipDocumentEntry[];
  columnMappings: SpreadsheetColumnMapping[];
  analysisComplete: boolean;
  preview: MigrationPreview | null;
  importOptions: ImportOptions;
  progress: ImportProgress | null;
  report: ImportReport | null;
  createdAt: string;
  updatedAt: string;
}
