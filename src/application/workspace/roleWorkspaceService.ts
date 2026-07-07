import type { Permission } from '../../lib/permissions';
import { hasPermission } from '../../lib/permissions';
import type { UserRole } from '../../domain/models/User';
import type {
  RoleNotification,
  WidgetId,
  WorkspaceLayout,
  WorkspaceQuickAction,
  WorkspaceRole,
  WorkspaceWidgetConfig,
} from '../../domain/workspace/WorkspaceTypes';
import { resolveWorkspaceRole } from '../../domain/workspace/WorkspaceTypes';

const QUICK_ACTIONS: Record<string, WorkspaceQuickAction> = {
  add_client: { id: 'add_client', label: 'Add Client', path: '/clients', icon: 'Users', color: 'bg-indigo-600', permission: 'clients:edit' },
  new_case: { id: 'new_case', label: 'New Case', path: '/cases', icon: 'FileText', color: 'bg-blue-600', permission: 'cases:edit' },
  schedule: { id: 'schedule', label: 'Schedule Meeting', path: '/calendar', icon: 'Calendar', color: 'bg-purple-600', permission: 'calendar:edit' },
  create_invoice: { id: 'create_invoice', label: 'Create Invoice', path: '/billing', icon: 'Receipt', color: 'bg-emerald-600', permission: 'billing:edit' },
  ai_intake: { id: 'ai_intake', label: 'AI Intake', path: '/ai-intake', icon: 'Sparkles', color: 'bg-violet-600', permission: 'ai-intake:view' },
  upload_docs: { id: 'upload_docs', label: 'Upload Documents', path: '/documents', icon: 'Upload', color: 'bg-cyan-600', permission: 'documents:edit' },
  approve_ai: { id: 'approve_ai', label: 'Approve AI', path: '/ai-intake', icon: 'CheckCircle', color: 'bg-emerald-600', permission: 'ai-intake:edit' },
  open_copilot: { id: 'open_copilot', label: 'Open Copilot', path: '/cases', icon: 'Bot', color: 'bg-indigo-600', permission: 'cases:view' },
  new_appointment: { id: 'new_appointment', label: 'New Appointment', path: '/calendar', icon: 'CalendarPlus', color: 'bg-blue-600', permission: 'calendar:edit' },
  check_in: { id: 'check_in', label: 'Check-in Client', path: '/clients', icon: 'UserCheck', color: 'bg-teal-600', permission: 'clients:view' },
  migration: { id: 'migration', label: 'Migration Wizard', path: '/migration', icon: 'Database', color: 'bg-slate-600', permission: 'migration:view' },
  view_leads: { id: 'view_leads', label: 'View Leads', path: '/leads', icon: 'UserSquare2', color: 'bg-amber-600', permission: 'leads:view' },
};

const ROLE_WIDGETS: Record<WorkspaceRole, WidgetId[]> = {
  owner: [
    'daily_briefing', 'firm_health', 'quick_actions', 'kpi_overview', 'kpi_revenue',
    'cases_by_stage', 'case_types_chart', 'today_schedule', 'upcoming_deadlines',
    'rfe_cases', 'interviews_upcoming', 'biometrics_upcoming', 'open_invoices',
    'ai_intake_queue', 'pending_ai_review', 'staff_workload', 'recent_activity',
    'uscis_quick_access', 'import_history', 'ai_costs',
  ],
  office_manager: [
    'daily_briefing', 'firm_health', 'quick_actions', 'kpi_overview', 'today_schedule',
    'upcoming_deadlines', 'open_invoices', 'staff_workload', 'recent_activity', 'notifications_summary',
  ],
  administrator: [
    'daily_briefing', 'firm_health', 'quick_actions', 'kpi_overview', 'staff_workload',
    'ai_costs', 'import_history', 'notifications_summary',
  ],
  attorney: [
    'daily_briefing', 'quick_actions', 'assigned_cases', 'my_tasks', 'upcoming_deadlines',
    'rfe_cases', 'missing_documents', 'today_schedule', 'interviews_upcoming', 'uscis_quick_access',
  ],
  paralegal: [
    'daily_briefing', 'quick_actions', 'pending_ai_review', 'missing_documents',
    'upcoming_deadlines', 'document_queue', 'my_tasks', 'biometrics_upcoming',
  ],
  legal_assistant: [
    'daily_briefing', 'quick_actions', 'my_tasks', 'document_queue', 'today_schedule',
  ],
  intake_specialist: [
    'daily_briefing', 'quick_actions', 'leads_widget', 'ai_intake_queue', 'unassigned_clients',
    'recent_clients',
  ],
  receptionist: [
    'daily_briefing', 'quick_actions', 'today_schedule', 'recent_clients', 'notifications_summary',
  ],
  billing: [
    'daily_briefing', 'quick_actions', 'billing_summary', 'overdue_invoices', 'open_invoices',
    'recent_payments', 'kpi_revenue',
  ],
  document_specialist: [
    'daily_briefing', 'quick_actions', 'document_queue', 'pending_ai_review', 'missing_documents',
  ],
  ai_review_operator: [
    'daily_briefing', 'quick_actions', 'pending_ai_review', 'ai_intake_queue', 'ai_costs',
  ],
};

const ROLE_ACTIONS: Record<WorkspaceRole, string[]> = {
  owner: ['add_client', 'new_case', 'schedule', 'create_invoice', 'ai_intake', 'migration'],
  office_manager: ['add_client', 'new_case', 'schedule', 'create_invoice', 'migration'],
  administrator: ['migration', 'add_client', 'new_case'],
  attorney: ['new_case', 'open_copilot', 'schedule', 'ai_intake'],
  paralegal: ['upload_docs', 'approve_ai', 'upload_docs'],
  legal_assistant: ['upload_docs', 'schedule'],
  intake_specialist: ['view_leads', 'ai_intake', 'add_client'],
  receptionist: ['new_appointment', 'check_in', 'add_client'],
  billing: ['create_invoice', 'add_client'],
  document_specialist: ['upload_docs', 'approve_ai'],
  ai_review_operator: ['approve_ai', 'ai_intake'],
};

export const WIDGET_PERMISSIONS: Record<WidgetId, Permission[]> = {
  daily_briefing: ['dashboard:view'],
  firm_health: ['dashboard:view', 'reports:view'],
  quick_actions: ['dashboard:view'],
  kpi_overview: ['dashboard:view'],
  kpi_revenue: ['billing:view'],
  today_schedule: ['calendar:view'],
  upcoming_deadlines: ['deadlines:view'],
  open_invoices: ['billing:view'],
  recent_payments: ['billing:view'],
  recent_clients: ['clients:view'],
  my_tasks: ['tasks:view'],
  recent_activity: ['dashboard:view'],
  cases_by_stage: ['cases:view', 'reports:view'],
  case_types_chart: ['cases:view', 'reports:view'],
  uscis_quick_access: ['cases:view'],
  assigned_cases: ['cases:view'],
  rfe_cases: ['cases:view'],
  missing_documents: ['documents:view'],
  ai_intake_queue: ['ai-intake:view'],
  pending_ai_review: ['ai-intake:view'],
  leads_widget: ['leads:view'],
  unassigned_clients: ['clients:view'],
  billing_summary: ['billing:view'],
  overdue_invoices: ['billing:view'],
  document_queue: ['documents:view'],
  staff_workload: ['dashboard:view', 'tasks:view'],
  import_history: ['migration:view'],
  ai_costs: ['ai-intake:view', 'settings:view'],
  notifications_summary: ['dashboard:view'],
  interviews_upcoming: ['calendar:view', 'cases:view'],
  biometrics_upcoming: ['deadlines:view'],
};

const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  owner: 'Executive overview of firm health, revenue, and operations',
  attorney: 'Your cases, deadlines, hearings, and AI copilot',
  paralegal: 'Document review, AI approvals, and case preparation',
  legal_assistant: 'Tasks, documents, and daily support workflow',
  intake_specialist: 'Leads, AI intake queue, and new client onboarding',
  receptionist: 'Appointments, walk-ins, and front desk operations',
  billing: 'Invoices, payments, and revenue tracking',
  document_specialist: 'OCR queue, document validation, and uploads',
  ai_review_operator: 'AI approvals, confidence warnings, and extraction review',
  office_manager: 'Operations, staff workload, and firm coordination',
  administrator: 'System administration and data management',
};

export function getWorkspaceLayout(userRole: UserRole): WorkspaceLayout {
  const role = resolveWorkspaceRole(userRole);
  return {
    role,
    label: ROLE_DESCRIPTIONS[role] ? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : role,
    description: ROLE_DESCRIPTIONS[role],
    widgets: ROLE_WIDGETS[role],
    quickActions: ROLE_ACTIONS[role].map((id) => QUICK_ACTIONS[id]).filter(Boolean),
  };
}

export function filterWidgetsByPermission(
  widgetIds: WidgetId[],
  userRole: UserRole,
): WidgetId[] {
  return widgetIds.filter((id) => {
    const perms = WIDGET_PERMISSIONS[id] ?? ['dashboard:view'];
    return perms.some((p) => hasPermission(userRole, p));
  });
}

export function filterQuickActionsByPermission(
  actions: WorkspaceQuickAction[],
  userRole: UserRole,
): WorkspaceQuickAction[] {
  return actions.filter((a) => !a.permission || hasPermission(userRole, a.permission));
}

export function getWidgetConfig(id: WidgetId): WorkspaceWidgetConfig {
  const titles: Record<WidgetId, string> = {
    daily_briefing: 'Daily Briefing',
    firm_health: 'Firm Health',
    quick_actions: 'Quick Actions',
    kpi_overview: 'Key Metrics',
    kpi_revenue: 'Revenue',
    today_schedule: "Today's Schedule",
    upcoming_deadlines: 'Upcoming Deadlines',
    open_invoices: 'Open Invoices',
    recent_payments: 'Recent Payments',
    recent_clients: 'Recent Clients',
    my_tasks: 'My Tasks',
    recent_activity: 'Recent Activity',
    cases_by_stage: 'Cases by Stage',
    case_types_chart: 'Top Case Types',
    uscis_quick_access: 'USCIS Quick Access',
    assigned_cases: 'My Assigned Cases',
    rfe_cases: 'RFE Cases',
    missing_documents: 'Missing Documents',
    ai_intake_queue: 'AI Intake Queue',
    pending_ai_review: 'Pending AI Review',
    leads_widget: 'New Leads',
    unassigned_clients: 'Unassigned Clients',
    billing_summary: 'Billing Summary',
    overdue_invoices: 'Overdue Invoices',
    document_queue: 'Document Queue',
    staff_workload: 'Staff Workload',
    import_history: 'Import History',
    ai_costs: 'AI Usage & Costs',
    notifications_summary: 'Notifications',
    interviews_upcoming: 'Upcoming Interviews',
    biometrics_upcoming: 'Biometrics Appointments',
  };
  return {
    id,
    title: titles[id] ?? id,
    permissions: WIDGET_PERMISSIONS[id] ?? ['dashboard:view'],
    colSpan: ['cases_by_stage', 'daily_briefing', 'firm_health'].includes(id) ? 2 : 1,
  };
}

export function filterNotificationsByPermission(
  notifications: RoleNotification[],
  userRole: UserRole,
): RoleNotification[] {
  return notifications.filter((n) => !n.permission || hasPermission(userRole, n.permission));
}

export const roleWorkspaceService = {
  getLayout: getWorkspaceLayout,
  filterWidgets: filterWidgetsByPermission,
  filterActions: filterQuickActionsByPermission,
  filterNotifications: filterNotificationsByPermission,
  getWidgetConfig,
  resolveRole: resolveWorkspaceRole,
};
