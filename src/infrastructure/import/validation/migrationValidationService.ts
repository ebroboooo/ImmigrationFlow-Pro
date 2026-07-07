import { validateReceiptNumber } from '../../../domain/uscis/receiptValidator';
import type {
  MigrationPreview,
  MigrationValidationIssue,
  PreviewCase,
  PreviewClient,
  PreviewLead,
} from '../../../domain/import/MigrationTypes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s().+\-]{7,20}$/;

function validateEmail(email: string | undefined, rowIndex: number, entity: string): MigrationValidationIssue[] {
  if (!email?.trim()) return [];
  if (!EMAIL_RE.test(email.trim())) {
    return [{ rowIndex, field: 'email', entityType: entity as MigrationValidationIssue['entityType'], message: `Invalid email: ${email}`, severity: 'error' }];
  }
  return [];
}

function validatePhone(phone: string | undefined, rowIndex: number, entity: string): MigrationValidationIssue[] {
  if (!phone?.trim()) return [];
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) {
    return [{ rowIndex, field: 'phone', entityType: entity as MigrationValidationIssue['entityType'], message: `Phone too short: ${phone}`, severity: 'warning' }];
  }
  if (!PHONE_RE.test(phone.trim())) {
    return [{ rowIndex, field: 'phone', entityType: entity as MigrationValidationIssue['entityType'], message: `Unusual phone format: ${phone}`, severity: 'warning' }];
  }
  return [];
}

function validateReceipt(receipt: string | undefined, rowIndex: number): MigrationValidationIssue[] {
  if (!receipt?.trim()) return [];
  const result = validateReceiptNumber(receipt);
  if (!result.valid) {
    return [{ rowIndex, field: 'receiptNumber', entityType: 'case', message: result.error ?? 'Invalid receipt', severity: 'error' }];
  }
  return [];
}

function validateDate(dateStr: string | undefined, field: string, rowIndex: number): MigrationValidationIssue[] {
  if (!dateStr?.trim()) return [];
  const parsed = Date.parse(dateStr);
  if (Number.isNaN(parsed)) {
    return [{ rowIndex, field, message: `Unrecognized date: ${dateStr}`, severity: 'warning' }];
  }
  return [];
}

function validateRequired(client: PreviewClient): MigrationValidationIssue[] {
  if (!client.name?.trim()) {
    return [{ rowIndex: client.sourceRow, entityType: 'client', field: 'clientName', message: 'Client name is required', severity: 'error' }];
  }
  return [];
}

export function validateMigrationPreview(preview: MigrationPreview): { warnings: MigrationValidationIssue[]; errors: MigrationValidationIssue[] } {
  const warnings: MigrationValidationIssue[] = [];
  const errors: MigrationValidationIssue[] = [];

  for (const client of preview.clients) {
    errors.push(...validateRequired(client));
    errors.push(...validateEmail(client.email, client.sourceRow, 'client'));
    warnings.push(...validatePhone(client.phone, client.sourceRow, 'client'));
  }

  for (const lead of preview.leads) {
    if (!lead.name?.trim()) {
      errors.push({ rowIndex: lead.sourceRow, entityType: 'lead', field: 'leadName', message: 'Lead name is required', severity: 'error' });
    }
    errors.push(...validateEmail(lead.email, lead.sourceRow, 'lead'));
    warnings.push(...validatePhone(lead.phone, lead.sourceRow, 'lead'));
  }

  for (const c of preview.cases) {
    if (!c.name?.trim()) {
      errors.push({ rowIndex: c.sourceRow, entityType: 'case', field: 'caseType', message: 'Case name is required', severity: 'error' });
    }
    errors.push(...validateReceipt(c.uscisReceiptNumber, c.sourceRow));
    warnings.push(...validateDate(c.priorityDate, 'priorityDate', c.sourceRow));
    if (c.clientKey && !preview.clients.some((cl) => cl.key === c.clientKey)) {
      errors.push({ rowIndex: c.sourceRow, entityType: 'case', message: `Broken client reference: ${c.clientKey}`, severity: 'error' });
    }
  }

  for (const d of preview.deadlines) {
    warnings.push(...validateDate(d.date, 'deadlineDate', d.sourceRow));
  }

  for (const a of preview.appointments) {
    warnings.push(...validateDate(a.startTime, 'appointmentDate', a.sourceRow));
  }

  return { warnings, errors };
}

export function validateClientRecord(client: PreviewClient): MigrationValidationIssue[] {
  return [...validateRequired(client), ...validateEmail(client.email, client.sourceRow, 'client'), ...validatePhone(client.phone, client.sourceRow, 'client')];
}

export function validateCaseRecord(c: PreviewCase): MigrationValidationIssue[] {
  return [...validateReceipt(c.uscisReceiptNumber, c.sourceRow)];
}

export function validateLeadRecord(lead: PreviewLead): MigrationValidationIssue[] {
  const issues: MigrationValidationIssue[] = [];
  if (!lead.name?.trim()) {
    issues.push({ rowIndex: lead.sourceRow, entityType: 'lead', message: 'Lead name required', severity: 'error' });
  }
  return issues;
}
