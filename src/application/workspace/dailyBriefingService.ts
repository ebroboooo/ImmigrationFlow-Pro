import { format } from 'date-fns';
import type { DailyBriefing, WorkspaceData, WorkspaceRole } from '../../domain/workspace/WorkspaceTypes';
import { WORKSPACE_ROLE_LABELS } from '../../domain/workspace/WorkspaceTypes';
import { calculateFirmHealth } from './firmHealthService';

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function generateDailyBriefing(
  data: WorkspaceData,
  workspaceRole: WorkspaceRole,
  userName: string,
): DailyBriefing {
  const firstName = userName.split(' ')[0] ?? userName;
  const { stats } = data;
  const health = calculateFirmHealth(data);
  const sections: DailyBriefing['sections'] = [];
  let urgentCount = 0;

  sections.push({
    title: "Today's Schedule",
    items: data.todayAppointments.length > 0
      ? data.todayAppointments.map((a) => `${a.title} at ${format(new Date(a.startTime), 'h:mm a')}`)
      : ['No appointments scheduled for today.'],
  });

  const urgent: string[] = [];
  if (stats.overdueDeadlines > 0) { urgent.push(`${stats.overdueDeadlines} overdue deadline(s) require action`); urgentCount++; }
  if (stats.rfeCases > 0) { urgent.push(`${stats.rfeCases} RFE case(s) need attention`); urgentCount++; }
  if (stats.pendingAiReview > 0) { urgent.push(`${stats.pendingAiReview} AI review(s) pending approval`); urgentCount++; }
  if (stats.overdueInvoices > 0) { urgent.push(`${stats.overdueInvoices} overdue invoice(s)`); urgentCount++; }
  sections.push({ title: 'Urgent Items', items: urgent.length ? urgent : ['No urgent items — you are on track.'] });

  if (workspaceRole === 'owner' || workspaceRole === 'office_manager') {
    sections.push({
      title: 'Firm Snapshot',
      items: [
        `Firm Health Score: ${health.overallScore}/100 (${health.grade})`,
        `${stats.activeCases} active cases · ${stats.revenueThisMonth.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} revenue this month`,
        health.recommendations[0],
      ],
    });
  }

  if (workspaceRole === 'attorney') {
    sections.push({
      title: 'My Cases',
      items: data.assignedCases.length > 0
        ? data.assignedCases.map((c) => `${c.name} — ${c.stage}`)
        : ['No cases directly assigned. Check the Cases page.'],
    });
  }

  if (workspaceRole === 'intake_specialist') {
    sections.push({
      title: 'Intake Pipeline',
      items: [
        `${stats.newLeads} new lead(s)`,
        `${stats.aiIntakeQueue} document(s) in AI intake queue`,
      ],
    });
  }

  if (workspaceRole === 'paralegal' || workspaceRole === 'document_specialist') {
    sections.push({
      title: 'Document Queue',
      items: [
        `${stats.pendingDocuments} document(s) awaiting upload/review`,
        `${stats.pendingAiReview} AI extraction(s) pending approval`,
      ],
    });
  }

  if (workspaceRole === 'billing') {
    sections.push({
      title: 'Billing Overview',
      items: [
        `${stats.openInvoices} open invoice(s)`,
        `${stats.overdueInvoices} overdue payment(s)`,
      ],
    });
  }

  sections.push({
    title: 'Recommended Actions',
    items: health.recommendations.slice(0, 3),
  });

  return {
    greeting: `${timeGreeting()}, ${firstName}.`,
    dateLabel: format(new Date(), 'EEEE, MMMM d, yyyy'),
    roleSummary: `Your ${WORKSPACE_ROLE_LABELS[workspaceRole]} workspace`,
    sections,
    urgentCount,
  };
}
