import { generateId } from '../../lib/utils';
import type { GeminiDocumentAnalysis } from '../../domain/ai/GeminiAnalysis';
import type { IntakeRecommendations } from '../../domain/ai/IntakeRecommendations';

export function mapGeminiAnalysisToRecommendations(analysis: GeminiDocumentAnalysis): IntakeRecommendations {
  return {
    caseSummary: analysis.summaries.plainEnglish,
    plainEnglishSummary: analysis.summaries.plainEnglish,
    attorneySummary: analysis.summaries.attorney,
    clientSummary: analysis.summaries.client,
    suggestedInternalNotes: analysis.summaries.internalNote,
    nextSteps: analysis.recommendedNextSteps,
    suggestedTasks: analysis.tasks.map((t) => ({
      ...t,
      id: generateId(),
      selected: true,
    })),
    suggestedCalendarEvents: analysis.calendarEvents.map((e) => ({
      ...e,
      id: generateId(),
      selected: true,
    })),
    suggestedDeadlines: analysis.deadlines.map((d) => ({
      ...d,
      id: generateId(),
      selected: true,
    })),
    suggestedEmail: {
      ...analysis.email,
      approved: false,
    },
    riskIndicators: analysis.warnings.filter((w) => w.toLowerCase().includes('risk')),
    riskLevel: analysis.riskLevel,
    warnings: analysis.warnings,
    missingInformation: [],
    requiredDocuments: analysis.missingDocuments,
    potentialFollowUps: analysis.requestedEvidence,
  };
}
