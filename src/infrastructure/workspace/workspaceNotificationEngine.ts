import type { RoleNotification, WorkspaceData, WorkspaceRole } from '../../domain/workspace/WorkspaceTypes';
import { generateId } from '../../lib/utils';

export function generateRoleNotifications(
  data: WorkspaceData,
  workspaceRole: WorkspaceRole,
): RoleNotification[] {
  const notifications: RoleNotification[] = [];
  const { stats } = data;

  if (stats.overdueDeadlines > 0) {
    notifications.push({
      id: generateId(),
      title: 'Overdue Deadlines',
      message: `${stats.overdueDeadlines} deadline(s) past due`,
      priority: 'critical',
      path: '/deadlines',
      permission: 'deadlines:view',
    });
  }

  if (stats.rfeCases > 0 && ['owner', 'attorney', 'paralegal', 'office_manager'].includes(workspaceRole)) {
    notifications.push({
      id: generateId(),
      title: 'RFE Cases',
      message: `${stats.rfeCases} case(s) with RFE received`,
      priority: 'high',
      path: '/cases',
      permission: 'cases:view',
    });
  }

  if (stats.pendingAiReview > 0 && ['owner', 'paralegal', 'ai_review_operator', 'intake_specialist'].includes(workspaceRole)) {
    notifications.push({
      id: generateId(),
      title: 'AI Review Pending',
      message: `${stats.pendingAiReview} document(s) awaiting AI approval`,
      priority: 'high',
      path: '/ai-intake',
      permission: 'ai-intake:view',
    });
  }

  if (stats.overdueInvoices > 0 && ['owner', 'billing', 'office_manager'].includes(workspaceRole)) {
    notifications.push({
      id: generateId(),
      title: 'Overdue Payments',
      message: `${stats.overdueInvoices} invoice(s) overdue`,
      priority: 'high',
      path: '/billing',
      permission: 'billing:view',
    });
  }

  if (stats.pendingDocuments > 10 && ['paralegal', 'document_specialist', 'attorney'].includes(workspaceRole)) {
    notifications.push({
      id: generateId(),
      title: 'Missing Documents',
      message: `${stats.pendingDocuments} documents pending upload`,
      priority: 'medium',
      path: '/documents',
      permission: 'documents:view',
    });
  }

  if (stats.newLeads > 0 && ['intake_specialist', 'owner', 'receptionist'].includes(workspaceRole)) {
    notifications.push({
      id: generateId(),
      title: 'New Leads',
      message: `${stats.newLeads} new lead(s) to contact`,
      priority: 'medium',
      path: '/leads',
      permission: 'leads:view',
    });
  }

  if (stats.todayAppointments > 0 && ['receptionist', 'attorney', 'owner'].includes(workspaceRole)) {
    notifications.push({
      id: generateId(),
      title: "Today's Appointments",
      message: `${stats.todayAppointments} appointment(s) scheduled today`,
      priority: 'low',
      path: '/calendar',
      permission: 'calendar:view',
    });
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
