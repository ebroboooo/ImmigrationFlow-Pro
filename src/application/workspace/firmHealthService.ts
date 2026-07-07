import type { FirmHealthResult, WorkspaceData } from '../../domain/workspace/WorkspaceTypes';

function scoreFromCount(count: number, thresholds: [number, number, number]): number {
  if (count === 0) return 100;
  if (count <= thresholds[0]) return 85;
  if (count <= thresholds[1]) return 65;
  if (count <= thresholds[2]) return 40;
  return 20;
}

export function calculateFirmHealth(data: WorkspaceData): FirmHealthResult {
  const { stats } = data;
  const categories = [
    { id: 'deadlines', label: 'Deadlines', score: scoreFromCount(stats.overdueDeadlines, [1, 3, 6]), weight: 0.2 },
    { id: 'billing', label: 'Billing', score: scoreFromCount(stats.overdueInvoices, [1, 3, 5]), weight: 0.15 },
    { id: 'documents', label: 'Documents', score: scoreFromCount(stats.pendingDocuments, [5, 15, 30]), weight: 0.15 },
    { id: 'ai_queue', label: 'AI Queue', score: scoreFromCount(stats.pendingAiReview, [2, 5, 10]), weight: 0.1 },
    { id: 'rfe', label: 'Open RFEs', score: scoreFromCount(stats.rfeCases, [1, 3, 5]), weight: 0.15 },
    { id: 'workload', label: 'Staff Workload', score: scoreFromCount(stats.openTasks, [20, 50, 100]), weight: 0.1 },
    { id: 'cases', label: 'Case Pipeline', score: stats.activeCases > 0 ? Math.min(100, 60 + stats.activeCases) : 50, weight: 0.15 },
  ];

  const overallScore = Math.round(
    categories.reduce((sum, c) => sum + c.score * c.weight, 0),
  );

  const grade: FirmHealthResult['grade'] =
    overallScore >= 90 ? 'Excellent'
      : overallScore >= 75 ? 'Good'
        : overallScore >= 60 ? 'Fair'
          : overallScore >= 40 ? 'At Risk'
            : 'Critical';

  const recommendations: string[] = [];
  const riskAlerts: string[] = [];

  if (stats.overdueDeadlines > 0) {
    recommendations.push(`Resolve ${stats.overdueDeadlines} overdue deadline(s) immediately.`);
    riskAlerts.push(`${stats.overdueDeadlines} overdue USCIS/legal deadlines`);
  }
  if (stats.rfeCases > 0) recommendations.push(`Review ${stats.rfeCases} open RFE case(s) and response timelines.`);
  if (stats.pendingDocuments > 5) recommendations.push(`Follow up on ${stats.pendingDocuments} missing client documents.`);
  if (stats.pendingAiReview > 0) recommendations.push(`Approve or reject ${stats.pendingAiReview} AI intake review(s).`);
  if (stats.overdueInvoices > 0) recommendations.push(`Send payment reminders for ${stats.overdueInvoices} overdue invoice(s).`);
  if (recommendations.length === 0) recommendations.push('Firm operations are healthy. Focus on proactive client communication.');

  return { overallScore, grade, categories, recommendations, riskAlerts };
}
