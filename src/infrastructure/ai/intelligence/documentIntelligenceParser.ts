import type { ParsedIntelligencePayload } from '../../../domain/ai/DocumentIntelligence';
import { extractJsonFromText, GeminiResponseParseError } from '../providers/gemini/geminiResponseParser';
import { normalizeDocumentType } from '../../../domain/ai/DocumentClassification';
import type { GeminiDocumentAnalysis, RiskLevel } from '../../../domain/ai/GeminiAnalysis';
import type {
  CaseEntity,
  DocumentIntelligenceResult,
  IntelligentFieldValue,
  PersonEntity,
  PersonRole,
  SmartIntelligenceRecommendation,
} from '../../../domain/ai/DocumentIntelligence';
import { createIntelligentField, emptyCaseEntity } from '../../../domain/ai/DocumentIntelligence';
import { generateId } from '../../../lib/utils';

const VALID_RISK: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'] as const;
const VALID_ROLES = ['Attorney', 'Paralegal', 'Client'] as const;
const VALID_EVENT_TYPES = ['Interview', 'Biometrics', 'Deadline', 'Follow-up', 'Document Request', 'Client Meeting'] as const;
const VALID_PERSON_ROLES: PersonRole[] = [
  'Client', 'Beneficiary', 'Petitioner', 'Sponsor', 'Attorney',
  'Interpreter', 'Translator', 'Employer', 'Dependent', 'Guardian', 'Other',
];
const VALID_REC_CATEGORIES = [
  'missing_document', 'appointment', 'deadline', 'rfe_risk', 'legal_action', 'email', 'calendar', 'task',
] as const;

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asString(x)).filter(Boolean);
}

function parseIntelligentField(raw: unknown, method: 'llm' | 'pattern' = 'llm'): IntelligentFieldValue | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const value = asString(obj.value);
  if (!value) return undefined;
  return createIntelligentField(value, asNumber(obj.confidence, 0.7), method, {
    sourceSnippet: asString(obj.sourceSnippet) || undefined,
    llmConfidence: asNumber(obj.confidence, 0.7),
    ocrConfidence: obj.ocrConfidence != null ? asNumber(obj.ocrConfidence) : undefined,
  });
}

function parseFieldArray(raw: unknown): IntelligentFieldValue[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => parseIntelligentField(item)).filter((f): f is IntelligentFieldValue => !!f);
}

function parsePersons(raw: unknown): PersonEntity[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = item as Record<string, unknown>;
    const roleRaw = asString(obj.role);
    const role = VALID_PERSON_ROLES.find((r) => r.toLowerCase() === roleRaw.toLowerCase()) ?? 'Other';
    return {
      id: generateId(),
      role,
      name: parseIntelligentField(obj.name),
      dateOfBirth: parseIntelligentField(obj.dateOfBirth),
      nationality: parseIntelligentField(obj.nationality),
      phone: parseIntelligentField(obj.phone),
      email: parseIntelligentField(obj.email),
      address: parseIntelligentField(obj.address),
      relationship: parseIntelligentField(obj.relationship),
      confidence: asNumber(obj.confidence, 0.7),
    };
  });
}

function parseCaseEntity(raw: unknown): CaseEntity {
  if (!raw || typeof raw !== 'object') return emptyCaseEntity();
  const obj = raw as Record<string, unknown>;
  return {
    receiptNumber: parseIntelligentField(obj.receiptNumber),
    aNumber: parseIntelligentField(obj.aNumber),
    caseNumber: parseIntelligentField(obj.caseNumber),
    uscisOnlineAccountNumber: parseIntelligentField(obj.uscisOnlineAccountNumber),
    priorityDate: parseIntelligentField(obj.priorityDate),
    caseCategory: parseIntelligentField(obj.caseCategory),
    visaCategory: parseIntelligentField(obj.visaCategory),
    currentStatus: parseIntelligentField(obj.currentStatus),
    deadlines: parseFieldArray(obj.deadlines),
    rfeDates: parseFieldArray(obj.rfeDates),
    interviewDates: parseFieldArray(obj.interviewDates),
    biometricsDates: parseFieldArray(obj.biometricsDates),
    expirationDates: parseFieldArray(obj.expirationDates),
    serviceCenter: parseIntelligentField(obj.serviceCenter),
    office: parseIntelligentField(obj.office),
  };
}

function parseSmartRecommendations(raw: unknown): SmartIntelligenceRecommendation[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = item as Record<string, unknown>;
    const catRaw = asString(obj.category).toLowerCase();
    const category = VALID_REC_CATEGORIES.find((c) => c === catRaw) ?? 'legal_action';
    const priRaw = asString(obj.priority).toLowerCase();
    const priority: SmartIntelligenceRecommendation['priority'] =
      priRaw === 'high' ? 'high' : priRaw === 'low' ? 'low' : 'medium';
    return {
      category,
      title: asString(obj.title) || 'Recommendation',
      description: asString(obj.description),
      priority,
    };
  }).filter((r) => r.title);
}

export type ParsedDocumentIntelligence = ParsedIntelligencePayload;

export function parseDocumentIntelligenceResponse(rawText: string): ParsedIntelligencePayload {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJsonFromText(rawText)) as Record<string, unknown>;
  } catch (err) {
    throw new GeminiResponseParseError(
      err instanceof Error ? `Malformed JSON: ${err.message}` : 'Malformed JSON from model.',
    );
  }

  const detectionRaw = (parsed.detection ?? parsed.classification ?? {}) as Record<string, unknown>;
  const docTypeRaw = asString(detectionRaw.documentType) || 'Unknown';
  const documentType = normalizeDocumentType(docTypeRaw);

  const schemaFieldsRaw = (parsed.schemaFields ?? parsed.fields ?? {}) as Record<string, unknown>;
  const schemaFields: Record<string, IntelligentFieldValue | null> = {};
  for (const [key, val] of Object.entries(schemaFieldsRaw)) {
    schemaFields[key] = parseIntelligentField(val) ?? null;
  }

  const persons = parsePersons(parsed.persons);
  const caseEntity = parseCaseEntity(parsed.caseEntity);

  const summariesRaw = (parsed.summaries ?? {}) as Record<string, unknown>;
  const summaries = {
    plainEnglish: asString(summariesRaw.plainEnglish),
    attorney: asString(summariesRaw.attorney),
    client: asString(summariesRaw.client),
    internalNote: asString(summariesRaw.internalNote),
  };

  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.map((t) => {
        const obj = t as Record<string, unknown>;
        return {
          title: asString(obj.title) || 'Task',
          description: asString(obj.description),
          priority: VALID_PRIORITIES.includes(asString(obj.priority) as typeof VALID_PRIORITIES[number])
            ? (asString(obj.priority) as typeof VALID_PRIORITIES[number])
            : 'Medium',
          dueDate: asString(obj.dueDate) || undefined,
          responsibleRole: VALID_ROLES.includes(asString(obj.responsibleRole) as typeof VALID_ROLES[number])
            ? (asString(obj.responsibleRole) as typeof VALID_ROLES[number])
            : undefined,
          urgency: asString(obj.urgency) || undefined,
        };
      })
    : [];

  const calendarEvents = Array.isArray(parsed.calendarEvents)
    ? parsed.calendarEvents.map((e) => {
        const obj = e as Record<string, unknown>;
        return {
          title: asString(obj.title) || 'Event',
          type: VALID_EVENT_TYPES.includes(asString(obj.type) as typeof VALID_EVENT_TYPES[number])
            ? (asString(obj.type) as typeof VALID_EVENT_TYPES[number])
            : 'Follow-up',
          start: asString(obj.start) || new Date().toISOString(),
          end: asString(obj.end) || undefined,
          location: asString(obj.location) || undefined,
          notes: asString(obj.notes) || undefined,
        };
      })
    : [];

  const deadlines = Array.isArray(parsed.deadlines)
    ? parsed.deadlines.map((d) => {
        const obj = d as Record<string, unknown>;
        return {
          title: asString(obj.title) || 'Deadline',
          type: asString(obj.type) || 'USCIS',
          date: asString(obj.date) || '',
        };
      })
    : [];

  const emailRaw = (parsed.email ?? {}) as Record<string, unknown>;
  const riskRaw = asString(parsed.riskLevel).toLowerCase();
  const riskLevel: RiskLevel = VALID_RISK.includes(riskRaw as RiskLevel) ? (riskRaw as RiskLevel) : 'medium';

  const geminiAnalysis: GeminiDocumentAnalysis = {
    classification: { documentType, confidence: asNumber(detectionRaw.confidence, 0.7) },
    fields: Object.fromEntries(
      Object.entries(schemaFields).map(([k, v]) => [k, v ? { value: v.value, confidence: v.confidence } : null]),
    ),
    summaries,
    tasks,
    calendarEvents,
    deadlines,
    email: {
      subject: asString(emailRaw.subject),
      body: asString(emailRaw.body),
      to: asString(emailRaw.to) || undefined,
    },
    missingDocuments: asStringArray(parsed.missingDocuments),
    requestedEvidence: asStringArray(parsed.requestedEvidence),
    recommendedNextSteps: asStringArray(parsed.recommendedNextSteps),
    warnings: asStringArray(parsed.warnings),
    riskLevel,
    overallConfidence: asNumber(parsed.overallConfidence, 0.7),
  };

  const legacyFields: Record<string, { value: string; confidence: number } | null> = {};
  for (const [key, val] of Object.entries(geminiAnalysis.fields)) {
    legacyFields[key] = val;
  }

  const intelligence: Partial<DocumentIntelligenceResult> = {
    detection: {
      documentType,
      confidence: asNumber(detectionRaw.confidence, 0.7),
      reason: asString(detectionRaw.reason) || `Classified as ${documentType}`,
      source: 'llm',
    },
    schemaExtraction: { documentType, fields: schemaFields },
    persons,
    caseEntity,
    missingInformation: asStringArray(parsed.missingInformation),
    smartRecommendations: parseSmartRecommendations(parsed.smartRecommendations),
    overallConfidence: geminiAnalysis.overallConfidence,
    warnings: geminiAnalysis.warnings.map((message) => ({ message, severity: 'warning' as const })),
  };

  return { intelligence, geminiAnalysis };
}

export function mergeLegacyFieldsFromIntelligence(
  geminiFields: GeminiDocumentAnalysis['fields'],
  persons: PersonEntity[],
  caseEntity: CaseEntity,
): Record<string, { value: string; confidence: number } | null> {
  const merged = { ...geminiFields };
  const mapField = (key: string, field?: IntelligentFieldValue) => {
    if (field?.value && !merged[key]) merged[key] = { value: field.value, confidence: field.confidence };
  };
  mapField('receiptNumber', caseEntity.receiptNumber);
  mapField('aNumber', caseEntity.aNumber);
  mapField('priorityDate', caseEntity.priorityDate);
  mapField('office', caseEntity.office);
  for (const p of persons) {
    if (p.role === 'Beneficiary') mapField('beneficiary', p.name);
    if (p.role === 'Petitioner') mapField('petitioner', p.name);
    if (p.role === 'Client') mapField('clientName', p.name);
    if (p.role === 'Attorney') mapField('attorney', p.name);
    mapField('email', p.email);
    mapField('phone', p.phone);
    mapField('address', p.address);
  }
  return merged;
}
