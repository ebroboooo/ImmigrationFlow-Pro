import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspaceRole } from '../../domain/workspace/WorkspaceTypes.ts';
import { calculateFirmHealth } from './firmHealthService.ts';
import { generateDailyBriefing } from './dailyBriefingService.ts';
import {
  getWorkspaceLayout,
  filterWidgetsByPermission,
  filterQuickActionsByPermission,
  filterNotificationsByPermission,
} from './roleWorkspaceService.ts';
import { generateRoleNotifications } from '../../infrastructure/workspace/workspaceNotificationEngine.ts';
import type { WorkspaceData } from '../../domain/workspace/WorkspaceTypes.ts';

function emptyWorkspaceData(overrides: Partial<WorkspaceData['stats']> = {}): WorkspaceData {
  const stats = {
    totalClients: 10,
    activeCases: 5,
    pendingUSCIS: 2,
    overdueDeadlines: 0,
    pendingDocuments: 0,
    revenueThisMonth: 5000,
    openInvoices: 2,
    rfeCases: 0,
    pendingAiReview: 0,
    aiIntakeQueue: 0,
    overdueInvoices: 0,
    openTasks: 3,
    todayAppointments: 1,
    newLeads: 2,
    ...overrides,
  };
  return {
    stats,
    tasks: [],
    activities: [],
    todayAppointments: [{ id: '1', tenantId: 't1', title: 'Consultation', type: 'Consultation', status: 'Scheduled', startTime: new Date(), endTime: new Date(), clientId: 'c1', caseId: undefined, location: '', notes: '', createdAt: new Date(), updatedAt: new Date() }],
    upcomingDeadlines: [],
    recentClients: [],
    openInvoices: [],
    recentPayments: [],
    overdueInvoices: [],
    caseStageData: [{ name: 'Active', count: 3 }],
    caseTypeData: [{ name: 'I-130', value: 2 }],
    allCases: [],
    assignedCases: [],
    rfeCases: [],
    revenueSparkline: [100, 200, 300],
    leads: [],
    pendingDocuments: [],
    aiIntakePending: 0,
    staffTaskCounts: [],
    aiCostEstimate: 0.05,
    interviewsUpcoming: [],
    biometricsUpcoming: [],
  };
}

describe('resolveWorkspaceRole', () => {
  it('maps CRM user roles to workspace roles', () => {
    assert.equal(resolveWorkspaceRole('admin'), 'owner');
    assert.equal(resolveWorkspaceRole('attorney'), 'attorney');
    assert.equal(resolveWorkspaceRole('sales'), 'intake_specialist');
    assert.equal(resolveWorkspaceRole('viewer'), 'document_specialist');
    assert.equal(resolveWorkspaceRole('employee'), 'legal_assistant');
  });
});

describe('roleWorkspaceService dashboard selection', () => {
  it('returns owner widgets for admin role', () => {
    const layout = getWorkspaceLayout('admin');
    assert.equal(layout.role, 'owner');
    assert.ok(layout.widgets.includes('firm_health'));
    assert.ok(layout.widgets.includes('daily_briefing'));
  });

  it('returns attorney-specific widgets for attorney role', () => {
    const layout = getWorkspaceLayout('attorney');
    assert.equal(layout.role, 'attorney');
    assert.ok(layout.widgets.includes('assigned_cases'));
    assert.ok(!layout.widgets.includes('firm_health'));
  });

  it('returns intake widgets for sales role', () => {
    const layout = getWorkspaceLayout('sales');
    assert.equal(layout.role, 'intake_specialist');
    assert.ok(layout.widgets.includes('leads_widget'));
    assert.ok(layout.widgets.includes('ai_intake_queue'));
  });
});

describe('permission filtering', () => {
  it('hides billing widgets from viewer role', () => {
    const layout = getWorkspaceLayout('admin');
    const filtered = filterWidgetsByPermission(layout.widgets, 'viewer');
    assert.ok(!filtered.includes('kpi_revenue'));
    assert.ok(!filtered.includes('open_invoices'));
  });

  it('filters quick actions by permission', () => {
    const layout = getWorkspaceLayout('attorney');
    const actions = filterQuickActionsByPermission(layout.quickActions, 'employee');
    assert.equal(actions.length, 0);
  });

  it('filters notifications by permission', () => {
    const data = emptyWorkspaceData({ overdueDeadlines: 2 });
    const notifications = generateRoleNotifications(data, 'owner');
    const viewerFiltered = filterNotificationsByPermission(notifications, 'viewer');
    assert.equal(viewerFiltered.length, 0);
    const adminFiltered = filterNotificationsByPermission(notifications, 'admin');
    assert.ok(adminFiltered.length > 0);
  });
});

describe('calculateFirmHealth', () => {
  it('returns excellent score when no issues', () => {
    const result = calculateFirmHealth(emptyWorkspaceData());
    assert.ok(result.overallScore >= 75);
    assert.equal(result.grade, 'Excellent');
    assert.ok(result.recommendations.length > 0);
  });

  it('lowers score and adds alerts when deadlines overdue', () => {
    const healthy = calculateFirmHealth(emptyWorkspaceData());
    const risky = calculateFirmHealth(emptyWorkspaceData({ overdueDeadlines: 5, rfeCases: 3, overdueInvoices: 2 }));
    assert.ok(risky.overallScore < healthy.overallScore);
    assert.ok(risky.riskAlerts.length > 0);
  });
});

describe('generateDailyBriefing', () => {
  it('includes greeting and role summary', () => {
    const briefing = generateDailyBriefing(emptyWorkspaceData(), 'attorney', 'Jane Smith');
    assert.match(briefing.greeting, /Jane/);
    assert.match(briefing.roleSummary, /Attorney/);
    assert.ok(briefing.sections.some((s) => s.title === "Today's Schedule"));
  });

  it('includes firm snapshot for owner role', () => {
    const briefing = generateDailyBriefing(emptyWorkspaceData(), 'owner', 'John Doe');
    assert.ok(briefing.sections.some((s) => s.title === 'Firm Snapshot'));
  });

  it('counts urgent items', () => {
    const briefing = generateDailyBriefing(
      emptyWorkspaceData({ overdueDeadlines: 2, pendingAiReview: 1 }),
      'paralegal',
      'Alex',
    );
    assert.ok(briefing.urgentCount >= 2);
  });
});
