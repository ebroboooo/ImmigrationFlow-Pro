import type { GeminiDocumentAnalysis, RiskLevel } from '../../../../domain/ai/GeminiAnalysis';
import { normalizeDocumentType } from '../../../../domain/ai/DocumentClassification';

const VALID_RISK: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'] as const;
const VALID_ROLES = ['Attorney', 'Paralegal', 'Client'] as const;
const VALID_EVENT_TYPES = ['Interview', 'Biometrics', 'Deadline', 'Follow-up', 'Document Request', 'Client Meeting'] as const;

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


function parseFieldEntry(raw: unknown): { value: string; confidence: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const value = asString(obj.value);
  if (!value) return null;
  return { value, confidence: Math.min(1, Math.max(0, asNumber(obj.confidence, 0.7))) };
}

export class GeminiResponseParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiResponseParseError';
  }
}

export function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new GeminiResponseParseError('No JSON object found in model response.');
}

export function parseGeminiDocumentAnalysis(rawText: string): GeminiDocumentAnalysis {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJsonFromText(rawText)) as Record<string, unknown>;
  } catch (err) {
    throw new GeminiResponseParseError(
      err instanceof Error ? `Malformed JSON: ${err.message}` : 'Malformed JSON from Gemini.',
    );
  }

  const classificationRaw = (parsed.classification ?? {}) as Record<string, unknown>;
  const docTypeRaw = asString(classificationRaw.documentType) || 'Unknown';

  const fieldsRaw = (parsed.fields ?? {}) as Record<string, unknown>;
  const fields: GeminiDocumentAnalysis['fields'] = {};
  for (const [key, val] of Object.entries(fieldsRaw)) {
    fields[key] = parseFieldEntry(val);
  }

  const summariesRaw = (parsed.summaries ?? {}) as Record<string, unknown>;
  const summaries = {
    plainEnglish: asString(summariesRaw.plainEnglish),
    attorney: asString(summariesRaw.attorney),
    client: asString(summariesRaw.client),
    internalNote: asString(summariesRaw.internalNote),
  };

  const tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : []).map((t) => {
    const o = (t ?? {}) as Record<string, unknown>;
    const priorityRaw = asString(o.priority);
    const priority = VALID_PRIORITIES.includes(priorityRaw as typeof VALID_PRIORITIES[number])
      ? (priorityRaw as typeof VALID_PRIORITIES[number])
      : 'Medium';
    const roleRaw = asString(o.responsibleRole);
    const responsibleRole = VALID_ROLES.includes(roleRaw as typeof VALID_ROLES[number])
      ? (roleRaw as typeof VALID_ROLES[number])
      : undefined;
    return {
      title: asString(o.title) || 'Review document',
      description: asString(o.description),
      priority,
      dueDate: asString(o.dueDate) || undefined,
      responsibleRole,
      urgency: asString(o.urgency) || undefined,
    };
  });

  const calendarEvents = (Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : []).map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    const typeRaw = asString(o.type);
    const type = VALID_EVENT_TYPES.includes(typeRaw as typeof VALID_EVENT_TYPES[number])
      ? (typeRaw as typeof VALID_EVENT_TYPES[number])
      : 'Follow-up';
    return {
      title: asString(o.title) || 'Follow-up',
      type,
      start: asString(o.start) || new Date().toISOString(),
      end: asString(o.end) || undefined,
      location: asString(o.location) || undefined,
      notes: asString(o.notes) || undefined,
    };
  });

  const deadlines = (Array.isArray(parsed.deadlines) ? parsed.deadlines : []).map((d) => {
    const o = (d ?? {}) as Record<string, unknown>;
    return {
      title: asString(o.title) || 'Deadline',
      type: asString(o.type) || 'USCIS',
      date: asString(o.date) || new Date().toISOString().slice(0, 10),
    };
  });

  const emailRaw = (parsed.email ?? {}) as Record<string, unknown>;
  const riskRaw = asString(parsed.riskLevel).toLowerCase() as RiskLevel;

  return {
    classification: {
      documentType: normalizeDocumentType(docTypeRaw),
      confidence: Math.min(1, Math.max(0, asNumber(classificationRaw.confidence, 0.75))),
    },
    fields,
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
    riskLevel: VALID_RISK.includes(riskRaw) ? riskRaw : 'medium',
    overallConfidence: Math.min(1, Math.max(0, asNumber(parsed.overallConfidence, 0.7))),
  };
}
