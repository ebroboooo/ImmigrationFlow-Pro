import type { CaseCopilotInsights, CaseRiskItem } from '../../../../domain/ai/CaseCopilot';
import { CASE_COPILOT_DISCLAIMER } from '../../../../domain/ai/CaseCopilot';
import type { CaseContext } from '../../../../domain/ai/CaseContext';
import type { RiskLevel } from '../../../../domain/ai/GeminiAnalysis';
import { extractJsonFromText } from './geminiResponseParser.ts';

const VALID_RISK: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asString(x)).filter(Boolean);
}

function parseRiskItems(raw: unknown): CaseRiskItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const sev = asString(o.severity).toLowerCase() as RiskLevel;
    return {
      category: asString(o.category) || 'General',
      severity: VALID_RISK.includes(sev) ? sev : 'medium',
      message: asString(o.message),
      recommendation: asString(o.recommendation),
    };
  }).filter((r) => r.message);
}

export function parseCaseCopilotInsights(rawText: string, context: CaseContext, providerId: string): CaseCopilotInsights {
  const parsed = JSON.parse(extractJsonFromText(rawText)) as Record<string, unknown>;
  const riskRaw = asString(parsed.riskLevel).toLowerCase() as RiskLevel;

  return {
    executiveSummary: asString(parsed.executiveSummary),
    currentStatus: asString(parsed.currentStatus),
    timelineSummary: asString(parsed.timelineSummary),
    timelineNarrative: asString(parsed.timelineNarrative),
    missingDocuments: asStringArray(parsed.missingDocuments),
    upcomingDeadlines: (Array.isArray(parsed.upcomingDeadlines) ? parsed.upcomingDeadlines : []).map((d) => {
      const o = (d ?? {}) as Record<string, unknown>;
      return { title: asString(o.title), date: asString(o.date), type: asString(o.type) };
    }),
    openTasks: (Array.isArray(parsed.openTasks) ? parsed.openTasks : []).map((t) => {
      const o = (t ?? {}) as Record<string, unknown>;
      return { title: asString(o.title), priority: asString(o.priority), dueDate: asString(o.dueDate) || undefined };
    }),
    riskLevel: VALID_RISK.includes(riskRaw) ? riskRaw : 'medium',
    riskItems: parseRiskItems(parsed.riskItems),
    suggestedNextActions: asStringArray(parsed.suggestedNextActions),
    recentAiAnalyses: context.intakeSessions.map((s) => ({
      fileName: s.fileName,
      documentType: s.documentType ?? 'Unknown',
      date: s.createdAt,
      summary: s.summary,
    })),
    providerId,
    fromCache: false,
    generatedAt: new Date().toISOString(),
    disclaimer: CASE_COPILOT_DISCLAIMER,
  };
}

export function parseEmailDraft(rawText: string): { subject: string; body: string } {
  const parsed = JSON.parse(extractJsonFromText(rawText)) as Record<string, unknown>;
  return { subject: asString(parsed.subject), body: asString(parsed.body) };
}
