import { isToday, isWithinInterval, addDays } from 'date-fns';
import type { IUnitOfWork } from '../../domain/repositories/IRepository';
import type { WorkspaceData, WorkspaceStats } from '../../domain/workspace/WorkspaceTypes';
import { intakeSessionStorage } from '../../infrastructure/ai/storage/intakeSessionStorage';
import { loadUsage } from '../../infrastructure/ai/telemetry/aiUsageTelemetry';

export interface LoadWorkspaceDataInput {
  repos: IUnitOfWork;
  tenantId: string;
  userId: string;
}

export async function loadWorkspaceData(input: LoadWorkspaceDataInput): Promise<WorkspaceData> {
  const { repos, tenantId, userId } = input;
  const [
    allClients, allCases, allTasks, allActivities, allDeadlines,
    allDocuments, allInvoices, allAppointments, allLeads,
  ] = await Promise.all([
    repos.clients.getAll(tenantId),
    repos.cases.getAll(tenantId),
    repos.tasks.getAll(tenantId),
    repos.activities.getAll(tenantId),
    repos.deadlines.getAll(tenantId),
    repos.documents.getAll(tenantId),
    repos.invoices.getAll(tenantId),
    repos.appointments.getAll(tenantId),
    repos.leads.getAll(tenantId),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeCases = allCases.filter((c) => !['Closed', 'Denied'].includes(c.stage));
  const pendingUSCIS = allCases.filter((c) => c.stage === 'Pending USCIS');
  const rfeCases = allCases.filter((c) => c.stage === 'RFE Received');
  const overdueDeadlines = allDeadlines.filter((d) => d.status === 'Pending' && new Date(d.date) < now);
  const pendingDocs = allDocuments.filter((d) => d.status === 'Pending');
  const paidThisMonth = allInvoices.filter((i) => i.status === 'Paid' && new Date(i.createdAt) >= startOfMonth);
  const monthRevenue = paidThisMonth.reduce((s, i) => s + i.paidAmount, 0);
  const unpaid = allInvoices.filter((i) => !['Paid', 'Draft'].includes(i.status));
  const overdueInvoices = unpaid.filter((i) => new Date(i.dueDate) < now);

  const intakeSessions = intakeSessionStorage.getAll(tenantId);
  const pendingAiReview = intakeSessions.filter((s) => s.status === 'awaiting_review' || s.status === 'ocr_pending').length;
  const aiUsage = loadUsage();
  const aiCostEstimate = aiUsage.reduce((s, u) => s + (u.estimatedCostUsd ?? 0), 0);

  const stats: WorkspaceStats = {
    totalClients: allClients.length,
    activeCases: activeCases.length,
    pendingUSCIS: pendingUSCIS.length,
    overdueDeadlines: overdueDeadlines.length,
    pendingDocuments: pendingDocs.length,
    revenueThisMonth: monthRevenue,
    openInvoices: unpaid.length,
    rfeCases: rfeCases.length,
    pendingAiReview,
    aiIntakeQueue: intakeSessions.filter((s) => !['approved', 'rejected', 'automation_complete', 'failed'].includes(s.status)).length,
    overdueInvoices: overdueInvoices.length,
    openTasks: allTasks.filter((t) => t.status !== 'Completed').length,
    todayAppointments: allAppointments.filter((a) => a.status !== 'Cancelled' && isToday(new Date(a.startTime))).length,
    newLeads: allLeads.filter((l) => l.status === 'New Lead').length,
  };

  const taskCounts = new Map<string, number>();
  for (const t of allTasks.filter((t) => t.status !== 'Completed')) {
    if (t.assignedUserId) taskCounts.set(t.assignedUserId, (taskCounts.get(t.assignedUserId) ?? 0) + 1);
  }

  const spark: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const rev = allInvoices.filter((inv) =>
      inv.status === 'Paid' && new Date(inv.createdAt) >= d && new Date(inv.createdAt) <= end,
    ).reduce((s, inv) => s + inv.paidAmount, 0);
    spark.push(rev);
  }

  const stages = ['Assessment', 'Preparation', 'Filed', 'Pending USCIS', 'RFE Received', 'Approved'];
  const typeMap: Record<string, number> = {};
  allCases.forEach((c) => { typeMap[c.caseType] = (typeMap[c.caseType] || 0) + 1; });

  return {
    stats,
    tasks: allTasks.filter((t) => t.assignedUserId === userId || !t.assignedUserId)
      .filter((t) => t.status !== 'Completed').slice(0, 8),
    activities: allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    todayAppointments: allAppointments.filter((a) =>
      a.status !== 'Cancelled' && isToday(new Date(a.startTime)),
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 8),
    upcomingDeadlines: allDeadlines.filter((d) =>
      d.status === 'Pending' && isWithinInterval(new Date(d.date), { start: now, end: addDays(now, 14) }),
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 8),
    recentClients: [...allClients].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    openInvoices: unpaid.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 8),
    recentPayments: allInvoices.filter((i) => i.paidAmount > 0)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8),
    overdueInvoices: overdueInvoices.slice(0, 8),
    caseStageData: stages.map((stage) => ({
      name: stage.replace('Pending USCIS', 'USCIS').replace('Assessment', 'Assess.'),
      count: allCases.filter((c) => c.stage === stage).length,
    })),
    caseTypeData: Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value })),
    allCases,
    assignedCases: allCases.filter((c) => c.assignedUserId === userId || c.assignedAttorney === userId).slice(0, 8),
    rfeCases: rfeCases.slice(0, 8),
    revenueSparkline: spark,
    leads: allLeads.filter((l) => ['New Lead', 'Contacted', 'Qualified'].includes(l.status)).slice(0, 8),
    pendingDocuments: pendingDocs.slice(0, 8),
    aiIntakePending: pendingAiReview,
    staffTaskCounts: [...taskCounts.entries()].map(([userId, count]) => ({ userId, count })).slice(0, 10),
    aiCostEstimate,
    interviewsUpcoming: allAppointments.filter((a) =>
      a.type === 'USCIS Interview' && a.status !== 'Cancelled' && new Date(a.startTime) >= now,
    ).slice(0, 5),
    biometricsUpcoming: allDeadlines.filter((d) =>
      d.type === 'Biometrics' && d.status === 'Pending' && new Date(d.date) >= now,
    ).slice(0, 5),
  };
}
