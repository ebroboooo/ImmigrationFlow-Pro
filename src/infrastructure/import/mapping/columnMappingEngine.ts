import type { ColumnMappingEntry, MigrationFieldKey } from '../../../domain/import/MigrationTypes';

interface MappingPattern {
  field: MigrationFieldKey;
  patterns: RegExp[];
  weight: number;
}

const FIELD_PATTERNS: MappingPattern[] = [
  { field: 'clientName', patterns: [/client\s*name/i, /full\s*name/i, /customer/i, /applicant/i, /^name$/i, /primary\s*name/i], weight: 1 },
  { field: 'beneficiary', patterns: [/beneficiary/i, /applicant\s*name/i], weight: 0.95 },
  { field: 'petitioner', patterns: [/petitioner/i, /sponsor/i], weight: 0.95 },
  { field: 'attorney', patterns: [/attorney/i, /lawyer/i, /counsel/i, /assigned\s*attorney/i], weight: 0.9 },
  { field: 'email', patterns: [/e-?mail/i, /email\s*address/i], weight: 1 },
  { field: 'phone', patterns: [/phone/i, /mobile/i, /cell/i, /telephone/i, /contact\s*number/i], weight: 1 },
  { field: 'receiptNumber', patterns: [/receipt/i, /uscis\s*receipt/i, /receipt\s*#/i], weight: 1 },
  { field: 'caseNumber', patterns: [/case\s*number/i, /case\s*#/i, /matter\s*number/i, /file\s*number/i], weight: 0.95 },
  { field: 'aNumber', patterns: [/a-?\s*number/i, /alien\s*number/i, /uscis\s*#/i, /^a#$/i], weight: 1 },
  { field: 'priorityDate', patterns: [/priority\s*date/i], weight: 1 },
  { field: 'interviewDate', patterns: [/interview\s*date/i, /interview/i], weight: 0.9 },
  { field: 'biometricsDate', patterns: [/biometric/i, /asc\s*appointment/i], weight: 0.9 },
  { field: 'filingDate', patterns: [/filing\s*date/i, /filed\s*date/i, /date\s*filed/i], weight: 0.9 },
  { field: 'status', patterns: [/^status$/i, /case\s*status/i, /current\s*status/i, /immigration\s*status/i], weight: 0.85 },
  { field: 'caseType', patterns: [/case\s*type/i, /form\s*type/i, /petition\s*type/i, /matter\s*type/i], weight: 0.9 },
  { field: 'visaCategory', patterns: [/visa\s*category/i, /visa\s*class/i, /visa\s*type/i, /category/i], weight: 0.85 },
  { field: 'country', patterns: [/country/i, /nationality/i, /citizenship/i, /country\s*of\s*origin/i], weight: 0.85 },
  { field: 'address', patterns: [/address/i, /street/i, /mailing/i, /city/i], weight: 0.8 },
  { field: 'notes', patterns: [/notes/i, /comments/i, /description/i, /remarks/i], weight: 0.75 },
  { field: 'invoiceAmount', patterns: [/invoice/i, /amount/i, /fee/i, /total/i, /billing/i], weight: 0.8 },
  { field: 'balance', patterns: [/balance/i, /outstanding/i, /owed/i], weight: 0.85 },
  { field: 'payment', patterns: [/payment/i, /paid/i, /deposit/i], weight: 0.85 },
  { field: 'appointmentDate', patterns: [/appointment/i, /meeting\s*date/i, /scheduled/i], weight: 0.85 },
  { field: 'deadlineDate', patterns: [/deadline/i, /due\s*date/i, /expiration/i, /expires/i], weight: 0.9 },
  { field: 'taskTitle', patterns: [/task/i, /action\s*item/i, /to-?do/i], weight: 0.85 },
  { field: 'documentName', patterns: [/document/i, /file\s*name/i, /attachment/i], weight: 0.8 },
  { field: 'leadName', patterns: [/lead/i, /prospect/i], weight: 0.9 },
  { field: 'company', patterns: [/company/i, /employer/i, /organization/i, /firm/i], weight: 0.85 },
  { field: 'ignore', patterns: [/^#$/i, /^id$/i, /row\s*num/i, /blank/i], weight: 0.5 },
];

function scoreColumn(header: string, pattern: MappingPattern): { score: number; reason: string } | null {
  let best = 0;
  let matched = '';
  for (const re of pattern.patterns) {
    if (re.test(header)) {
      const score = pattern.weight;
      if (score > best) {
        best = score;
        matched = re.source;
      }
    }
  }
  if (best === 0) return null;
  return { score: best, reason: `Matched pattern /${matched}/` };
}

export function mapColumn(header: string, usedFields: Set<MigrationFieldKey>): ColumnMappingEntry {
  const trimmed = header.trim();
  if (!trimmed) {
    return { sourceColumn: header, targetField: 'ignore', confidence: 1, reason: 'Empty column header' };
  }

  let bestField: MigrationFieldKey = 'unknown';
  let bestScore = 0;
  let bestReason = 'No pattern matched';

  for (const pattern of FIELD_PATTERNS) {
    if (usedFields.has(pattern.field) && pattern.field !== 'ignore') continue;
    const result = scoreColumn(trimmed, pattern);
    if (result && result.score > bestScore) {
      bestScore = result.score;
      bestField = pattern.field;
      bestReason = result.reason;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.98, 0.55 + bestScore * 0.35) : 0.2;
  if (bestField !== 'ignore' && bestField !== 'unknown') {
    usedFields.add(bestField);
  }

  return {
    sourceColumn: trimmed,
    targetField: bestField,
    confidence: Math.round(confidence * 100) / 100,
    reason: bestReason,
  };
}

export function mapSpreadsheetColumns(headers: string[]): ColumnMappingEntry[] {
  const usedFields = new Set<MigrationFieldKey>();
  return headers.map((h) => mapColumn(h, usedFields));
}

export function remapColumn(entry: ColumnMappingEntry, newField: MigrationFieldKey): ColumnMappingEntry {
  return { ...entry, targetField: newField, manualOverride: true, confidence: 1, reason: 'Manually corrected by user' };
}
