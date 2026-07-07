import type { Permission } from '../../lib/permissions';
import type { UserRole } from '../models/User';
import type { Task, Activity, Invoice, Deadline, Appointment, Case } from '../models/Sales';
import type { Client, Lead } from '../models/CRM';

export type WorkspaceRole =
  | 'owner'
  | 'attorney'
  | 'paralegal'
  | 'legal_assistant'
  | 'intake_specialist'
  | 'receptionist'
  | 'billing'
  | 'document_specialist'
  | 'ai_review_operator'
  | 'office_manager'
  | 'administrator';

export type WidgetId =
  | 'daily_briefing'
  | 'firm_health'
  | 'quick_actions'
  | 'kpi_overview'
  | 'kpi_revenue'
  | 'today_schedule'
  | 'upcoming_deadlines'
  | 'open_invoices'
  | 'recent_payments'
  | 'recent_clients'
  | 'my_tasks'
  | 'recent_activity'
  | 'cases_by_stage'
  | 'case_types_chart'
  | 'uscis_quick_access'
  | 'assigned_cases'
  | 'rfe_cases'
  | 'missing_documents'
  | 'ai_intake_queue'
  | 'pending_ai_review'
  | 'leads_widget'
  | 'unassigned_clients'
  | 'billing_summary'
  | 'overdue_invoices'
  | 'document_queue'
  | 'staff_workload'
  | 'import_history'
  | 'ai_costs'
  | 'notifications_summary'
  | 'interviews_upcoming'
  | 'biometrics_upcoming';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface WorkspaceQuickAction {
  id: string;
  label: string;
  path: string;
  icon: string;
  color: string;
  permission?: Permission;
}

export interface WorkspaceWidgetConfig {
  id: WidgetId;
  title: string;
  permissions: Permission[];
  colSpan?: 1 | 2;
}

export interface WorkspaceLayout {
  role: WorkspaceRole;
  label: string;
  description: string;
  widgets: WidgetId[];
  quickActions: WorkspaceQuickAction[];
}

export interface WorkspaceStats {
  totalClients: number;
  activeCases: number;
  pendingUSCIS: number;
  overdueDeadlines: number;
  pendingDocuments: number;
  revenueThisMonth: number;
  openInvoices: number;
  rfeCases: number;
  pendingAiReview: number;
  aiIntakeQueue: number;
  overdueInvoices: number;
  openTasks: number;
  todayAppointments: number;
  newLeads: number;
}

export interface WorkspaceData {
  stats: WorkspaceStats;
  tasks: Task[];
  activities: Activity[];
  todayAppointments: Appointment[];
  upcomingDeadlines: Deadline[];
  recentClients: Client[];
  openInvoices: Invoice[];
  recentPayments: Invoice[];
  overdueInvoices: Invoice[];
  caseStageData: { name: string; count: number }[];
  caseTypeData: { name: string; value: number }[];
  allCases: Case[];
  assignedCases: Case[];
  rfeCases: Case[];
  revenueSparkline: number[];
  leads: Lead[];
  pendingDocuments: import('../models/Sales').Document[];
  aiIntakePending: number;
  staffTaskCounts: { userId: string; count: number }[];
  aiCostEstimate: number;
  interviewsUpcoming: Appointment[];
  biometricsUpcoming: Deadline[];
}

export interface FirmHealthCategory {
  id: string;
  label: string;
  score: number;
  weight: number;
}

export interface FirmHealthResult {
  overallScore: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'At Risk' | 'Critical';
  categories: FirmHealthCategory[];
  recommendations: string[];
  riskAlerts: string[];
}

export interface DailyBriefingSection {
  title: string;
  items: string[];
}

export interface DailyBriefing {
  greeting: string;
  dateLabel: string;
  roleSummary: string;
  sections: DailyBriefingSection[];
  urgentCount: number;
}

export interface RoleNotification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  path?: string;
  permission?: Permission;
}

const USER_ROLE_MAP: Record<UserRole, WorkspaceRole> = {
  admin: 'owner',
  manager: 'office_manager',
  attorney: 'attorney',
  paralegal: 'paralegal',
  receptionist: 'receptionist',
  sales: 'intake_specialist',
  viewer: 'document_specialist',
  employee: 'legal_assistant',
};

export function resolveWorkspaceRole(userRole: UserRole): WorkspaceRole {
  return USER_ROLE_MAP[userRole] ?? 'legal_assistant';
}

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner / Managing Partner',
  attorney: 'Attorney',
  paralegal: 'Paralegal',
  legal_assistant: 'Legal Assistant',
  intake_specialist: 'Intake Specialist',
  receptionist: 'Receptionist',
  billing: 'Billing',
  document_specialist: 'Document Specialist',
  ai_review_operator: 'AI Review Operator',
  office_manager: 'Office Manager',
  administrator: 'Administrator',
};
