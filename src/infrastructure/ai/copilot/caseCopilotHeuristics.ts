import type { CaseContext } from '../../../domain/ai/CaseContext';
import type { CaseCopilotInsights, CaseRiskItem } from '../../../domain/ai/CaseCopilot';
import { CASE_COPILOT_DISCLAIMER } from '../../../domain/ai/CaseCopilot';
import type { RiskLevel } from '../../../domain/ai/GeminiAnalysis';

const REQUIRED_DOC_CATEGORIES = ['Passport', 'Birth Certificate', 'USCIS Notices'];

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000);
}

function maxRisk(levels: RiskLevel[]): RiskLevel {
  const order: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  let max = 0;
  for (const l of levels) {
    max = Math.max(max, order.indexOf(l));
  }
  return order[max] ?? 'low';
}

export function generateHeuristicInsights(context: CaseContext): CaseCopilotInsights {
  const now = new Date();
  const openTasks = context.tasks
    .filter((t) => t.status !== 'Completed')
    .map((t) => ({ title: t.title, priority: t.priority, dueDate: t.dueDate }));

  const upcomingDeadlines = context.deadlines
    .filter((d) => d.status === 'Pending' && new Date(d.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8)
    .map((d) => ({ title: d.title, date: d.date, type: d.type }));

  const uploadedCategories = new Set(context.documents.map((d) => d.category));
  const missingDocuments = REQUIRED_DOC_CATEGORIES.filter((c) => !uploadedCategories.has(c as typeof context.documents[number]['category']));

  const riskItems: CaseRiskItem[] = [];

  if (!context.client.email && !context.client.phone) {
    riskItems.push({
      category: 'Contact',
      severity: 'high',
      message: 'Missing client email and phone.',
      recommendation: 'Collect and update contact information in the client profile.',
    });
  }

  for (const d of context.deadlines.filter((x) => x.status === 'Pending')) {
    const days = daysUntil(d.date);
    if (days < 0) {
      riskItems.push({
        category: 'Deadline',
        severity: 'critical',
        message: `Missed deadline: ${d.title}`,
        recommendation: 'Review immediately and update case strategy.',
      });
    } else if (days <= 7) {
      riskItems.push({
        category: 'Deadline',
        severity: 'high',
        message: `Deadline in ${days} day(s): ${d.title}`,
        recommendation: 'Confirm preparation and calendar reminders.',
      });
    }
  }

  if (context.billingSummary.overdueCount > 0) {
    riskItems.push({
      category: 'Billing',
      severity: 'medium',
      message: `${context.billingSummary.overdueCount} overdue invoice(s).`,
      recommendation: 'Follow up on outstanding balances before continuing work.',
    });
  }

  if (missingDocuments.length > 0) {
    riskItems.push({
      category: 'Documents',
      severity: 'medium',
      message: `Potentially missing: ${missingDocuments.join(', ')}`,
      recommendation: 'Request documents from client and upload to the case file.',
    });
  }

  const lastEvent = context.timelineEvents.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
  if (lastEvent) {
    const inactiveDays = Math.floor((Date.now() - new Date(lastEvent.date).getTime()) / 86_400_000);
    if (inactiveDays > 30) {
      riskItems.push({
        category: 'Activity',
        severity: 'medium',
        message: `No recorded activity in ${inactiveDays} days.`,
        recommendation: 'Schedule a client check-in or case review.',
      });
    }
  }

  const primaryCase = context.cases[0];
  const executiveSummary = primaryCase
    ? `${context.client.name} — ${primaryCase.name} (${primaryCase.caseType}) is in ${primaryCase.stage} stage.`
    : `${context.client.name} — immigration status: ${context.client.immigrationStatus ?? 'Unknown'}.`;

  const timelineSummary = context.timelineEvents.length > 0
    ? `${context.timelineEvents.length} events on record. Latest: ${lastEvent?.title ?? 'N/A'}.`
    : 'No timeline events recorded yet.';

  const milestones = context.timelineEvents
    .filter((e) => ['case', 'document', 'deadline', 'status'].includes(e.type))
    .slice(-5)
    .map((e) => `${e.date.slice(0, 10)}: ${e.title}`)
    .join('; ');

  const suggestedNextActions: string[] = [];
  if (openTasks.length > 0) suggestedNextActions.push(`Complete ${openTasks.length} open task(s).`);
  if (upcomingDeadlines.length > 0) suggestedNextActions.push(`Prepare for upcoming deadline: ${upcomingDeadlines[0].title}.`);
  if (missingDocuments.length > 0) suggestedNextActions.push('Request missing documents from client.');
  if (suggestedNextActions.length === 0) suggestedNextActions.push('Review case file and schedule next client touchpoint.');

  return {
    executiveSummary,
    currentStatus: primaryCase?.stage ?? context.client.immigrationStatus ?? 'Unknown',
    timelineSummary,
    timelineNarrative: milestones || timelineSummary,
    missingDocuments,
    upcomingDeadlines,
    openTasks,
    riskLevel: maxRisk(riskItems.map((r) => r.severity)),
    riskItems,
    suggestedNextActions,
    recentAiAnalyses: context.intakeSessions.map((s) => ({
      fileName: s.fileName,
      documentType: s.documentType ?? 'Unknown',
      date: s.createdAt,
      summary: s.summary,
    })),
    providerId: 'heuristic',
    fromCache: false,
    generatedAt: new Date().toISOString(),
    disclaimer: CASE_COPILOT_DISCLAIMER,
  };
}
