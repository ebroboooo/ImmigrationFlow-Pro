import { useNavigate } from 'react-router-dom';
import {
  Users, FileText, Calendar, Receipt, Sparkles, Upload, CheckCircle2, Bot,
  CalendarPlus, UserCheck, Database, UserSquare2, AlertCircle, DollarSign,
  CalendarClock, CheckSquare, Activity as ActivityIcon, Zap, Shield, Bell,
} from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, cn } from '../../../lib/utils';
import { KpiCard } from '../ui/KpiCard';
import { DashboardWidget, WidgetRow } from '../ui/DashboardWidget';
import { UscisQuickAccess } from '../uscis/UscisQuickAccess';
import { roleWorkspaceService } from '../../../application/workspace/roleWorkspaceService';
import type {
  DailyBriefing,
  FirmHealthResult,
  WidgetId,
  WorkspaceData,
  WorkspaceQuickAction,
} from '../../../domain/workspace/WorkspaceTypes';

const ICON_MAP: Record<string, typeof Users> = {
  Users, FileText, Calendar, Receipt, Sparkles, Upload, CheckCircle: CheckCircle2,
  Bot, CalendarPlus, UserCheck, Database, UserSquare2,
};

interface WorkspaceWidgetGridProps {
  widgets: WidgetId[];
  data: WorkspaceData;
  health: FirmHealthResult | null;
  briefing: DailyBriefing | null;
  quickActions: WorkspaceQuickAction[];
}

function DailyBriefingWidget({ briefing }: { briefing: DailyBriefing | null }) {
  if (!briefing) return null;
  return (
    <div className="glass-card p-6 lg:col-span-2 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Briefing</h3>
      <p className="text-base text-indigo-600 dark:text-indigo-400">{briefing.roleSummary}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {briefing.sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{section.title}</h4>
            <ul className="text-base text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function FirmHealthWidget({ health }: { health: FirmHealthResult | null }) {
  if (!health) return null;
  const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#64748b'];
  return (
    <div className="glass-card p-6 lg:col-span-2 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Shield className="w-5 h-5 text-indigo-500" /> Firm Health Score — {health.overallScore}/100 ({health.grade})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {health.categories.map((c, i) => (
          <div key={c.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-xl font-bold" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{c.score}</p>
          </div>
        ))}
      </div>
      {health.riskAlerts.length > 0 && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 space-y-1">
          {health.riskAlerts.map((a) => <p key={a}>⚠ {a}</p>)}
        </div>
      )}
      <ul className="text-base text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
        {health.recommendations.slice(0, 4).map((r) => <li key={r}>{r}</li>)}
      </ul>
    </div>
  );
}

function QuickActionsBar({ actions }: { actions: WorkspaceQuickAction[] }) {
  const navigate = useNavigate();
  if (actions.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:col-span-2">
      {actions.map((action) => {
        const Icon = ICON_MAP[action.icon] ?? Zap;
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => navigate(action.path)}
            className="flex items-center gap-2.5 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-400 transition-all min-h-14"
          >
            <div className={cn('p-2 rounded-lg text-white shadow-sm', action.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function WorkspaceWidgetGrid({ widgets, data, health, briefing, quickActions }: WorkspaceWidgetGridProps) {
  const navigate = useNavigate();
  const { stats } = data;
  const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'daily_briefing':
        return <DailyBriefingWidget key={id} briefing={briefing} />;
      case 'firm_health':
        return <FirmHealthWidget key={id} health={health} />;
      case 'quick_actions':
        return <QuickActionsBar key={id} actions={quickActions} />;
      case 'kpi_overview':
        return (
          <div key={id} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:col-span-2">
            <KpiCard title="Total Clients" value={stats.totalClients} icon={Users} trend="Active & archived" />
            <KpiCard title="Active Cases" value={stats.activeCases} icon={FileText} iconColor="text-blue-500" iconBg="bg-blue-500/10" trendUp />
            <KpiCard title="Pending USCIS" value={stats.pendingUSCIS} icon={CalendarClock} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
            <KpiCard title="Overdue" value={stats.overdueDeadlines} icon={AlertCircle} iconColor={stats.overdueDeadlines > 0 ? 'text-red-500' : 'text-gray-400'} iconBg={stats.overdueDeadlines > 0 ? 'bg-red-500/10' : 'bg-gray-500/10'} onClick={() => navigate('/deadlines')} />
            <KpiCard title="Missing Docs" value={stats.pendingDocuments} icon={AlertCircle} onClick={() => navigate('/documents')} />
            <KpiCard title="Open Tasks" value={stats.openTasks} icon={CheckSquare} onClick={() => navigate('/tasks')} />
          </div>
        );
      case 'kpi_revenue':
        return (
          <KpiCard key={id} title="Revenue (Month)" value={stats.revenueThisMonth} icon={DollarSign} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" formatValue={formatCurrency} trend="Collected" trendUp sparkline={data.revenueSparkline} />
        );
      case 'today_schedule':
        return (
          <DashboardWidget key={id} title={roleWorkspaceService.getWidgetConfig(id).title} icon={Calendar} onViewAll={() => navigate('/calendar')} emptyTitle="No appointments today" emptyDescription="Calendar is clear.">
            {data.todayAppointments.map((a) => (
              <WidgetRow key={a.id} title={a.title} subtitle={`${format(new Date(a.startTime), 'h:mm a')} · ${a.type}`} onClick={() => navigate('/calendar')} />
            ))}
          </DashboardWidget>
        );
      case 'upcoming_deadlines':
        return (
          <DashboardWidget key={id} title="Upcoming Deadlines" icon={CalendarClock} onViewAll={() => navigate('/deadlines')} emptyTitle="No upcoming deadlines" emptyDescription="Nothing due in 14 days.">
            {data.upcomingDeadlines.map((d) => (
              <WidgetRow key={d.id} title={d.title} subtitle={`${d.type} · ${format(new Date(d.date), 'MMM d')}`} onClick={() => navigate('/deadlines')} />
            ))}
          </DashboardWidget>
        );
      case 'open_invoices':
        return (
          <DashboardWidget key={id} title="Open Invoices" icon={Receipt} onViewAll={() => navigate('/billing')} emptyTitle="All paid" emptyDescription="">
            {data.openInvoices.map((inv) => (
              <WidgetRow key={inv.id} title={formatCurrency(inv.amount - inv.paidAmount)} subtitle={`${inv.status} · Due ${format(new Date(inv.dueDate), 'MMM d')}`} onClick={() => navigate('/billing')} />
            ))}
          </DashboardWidget>
        );
      case 'overdue_invoices':
        return (
          <DashboardWidget key={id} title="Overdue Invoices" icon={AlertCircle} onViewAll={() => navigate('/billing')} emptyTitle="No overdue invoices" emptyDescription="">
            {data.overdueInvoices.map((inv) => (
              <WidgetRow key={inv.id} title={formatCurrency(inv.amount - inv.paidAmount)} subtitle={`Overdue · ${format(new Date(inv.dueDate), 'MMM d')}`} onClick={() => navigate('/billing')} />
            ))}
          </DashboardWidget>
        );
      case 'recent_payments':
        return (
          <DashboardWidget key={id} title="Recent Payments" icon={DollarSign} onViewAll={() => navigate('/billing')} emptyTitle="No payments" emptyDescription="">
            {data.recentPayments.map((inv) => (
              <WidgetRow key={inv.id} title={formatCurrency(inv.paidAmount)} subtitle={format(new Date(inv.updatedAt), 'MMM d')} onClick={() => navigate('/billing')} />
            ))}
          </DashboardWidget>
        );
      case 'recent_clients':
        return (
          <DashboardWidget key={id} title="Recent Clients" icon={Users} onViewAll={() => navigate('/clients')} emptyTitle="No clients" emptyDescription="">
            {data.recentClients.map((c) => (
              <WidgetRow key={c.id} title={c.name} subtitle={c.immigrationStatus ?? 'New Lead'} onClick={() => navigate('/clients')} />
            ))}
          </DashboardWidget>
        );
      case 'my_tasks':
        return (
          <DashboardWidget key={id} title="My Tasks" icon={CheckSquare} onViewAll={() => navigate('/tasks')} emptyTitle="All caught up" emptyDescription="">
            {data.tasks.map((t) => (
              <WidgetRow key={t.id} title={t.title} subtitle={`${t.priority} · ${t.dueDate ? format(t.dueDate, 'MMM d') : 'TBD'}`} onClick={() => navigate('/tasks')} />
            ))}
          </DashboardWidget>
        );
      case 'recent_activity':
        return (
          <DashboardWidget key={id} title="Recent Activity" icon={ActivityIcon} emptyTitle="No activity" emptyDescription="">
            {data.activities.map((a) => (
              <WidgetRow key={a.id} title={a.description} subtitle={format(a.createdAt, 'MMM d, h:mm a')} />
            ))}
          </DashboardWidget>
        );
      case 'assigned_cases':
        return (
          <DashboardWidget key={id} title="My Assigned Cases" icon={FileText} onViewAll={() => navigate('/cases')} emptyTitle="No assigned cases" emptyDescription="">
            {data.assignedCases.map((c) => (
              <WidgetRow key={c.id} title={c.name} subtitle={`${c.stage} · ${c.caseType}`} onClick={() => navigate('/cases')} />
            ))}
          </DashboardWidget>
        );
      case 'rfe_cases':
        return (
          <DashboardWidget key={id} title="RFE Cases" icon={AlertCircle} onViewAll={() => navigate('/cases')} emptyTitle="No RFE cases" emptyDescription="">
            {data.rfeCases.map((c) => (
              <WidgetRow key={c.id} title={c.name} subtitle={c.stage} onClick={() => navigate('/cases')} />
            ))}
          </DashboardWidget>
        );
      case 'missing_documents':
      case 'document_queue':
        return (
          <DashboardWidget key={id} title="Documents Pending" icon={FileText} onViewAll={() => navigate('/documents')} emptyTitle="All documents received" emptyDescription="">
            {data.pendingDocuments.map((d) => (
              <WidgetRow key={d.id} title={d.name} subtitle={d.category} onClick={() => navigate('/documents')} />
            ))}
          </DashboardWidget>
        );
      case 'ai_intake_queue':
      case 'pending_ai_review':
        return (
          <DashboardWidget key={id} title={id === 'pending_ai_review' ? 'Pending AI Review' : 'AI Intake Queue'} icon={Sparkles} onViewAll={() => navigate('/ai-intake')} emptyTitle="Queue empty" emptyDescription="">
            <WidgetRow title={`${stats.aiIntakeQueue} in pipeline`} subtitle={`${stats.pendingAiReview} awaiting review`} onClick={() => navigate('/ai-intake')} />
          </DashboardWidget>
        );
      case 'leads_widget':
        return (
          <DashboardWidget key={id} title="New Leads" icon={UserSquare2} onViewAll={() => navigate('/leads')} emptyTitle="No leads" emptyDescription="">
            {data.leads.map((l) => (
              <WidgetRow key={l.id} title={l.name} subtitle={`${l.status} · ${l.source}`} onClick={() => navigate('/leads')} />
            ))}
          </DashboardWidget>
        );
      case 'unassigned_clients':
        return (
          <DashboardWidget key={id} title="Recent Clients" icon={Users} onViewAll={() => navigate('/clients')} emptyTitle="No unassigned" emptyDescription="">
            {data.recentClients.filter((c) => c.immigrationStatus === 'New Lead').map((c) => (
              <WidgetRow key={c.id} title={c.name} subtitle="New Lead — needs assignment" onClick={() => navigate('/clients')} />
            ))}
          </DashboardWidget>
        );
      case 'billing_summary':
        return (
          <DashboardWidget key={id} title="Billing Summary" icon={Receipt} onViewAll={() => navigate('/billing')} emptyTitle="" emptyDescription="">
            <WidgetRow title={`${stats.openInvoices} open invoices`} subtitle={`${stats.overdueInvoices} overdue`} onClick={() => navigate('/billing')} />
            <WidgetRow title={formatCurrency(stats.revenueThisMonth)} subtitle="Revenue this month" onClick={() => navigate('/billing')} />
          </DashboardWidget>
        );
      case 'staff_workload':
        return (
          <DashboardWidget key={id} title="Staff Workload" icon={Users} emptyTitle="No tasks assigned" emptyDescription="">
            {data.staffTaskCounts.map((s) => (
              <WidgetRow key={s.userId} title={`Staff ${s.userId.slice(0, 8)}…`} subtitle={`${s.count} open task(s)`} onClick={() => navigate('/tasks')} />
            ))}
          </DashboardWidget>
        );
      case 'import_history':
        return (
          <DashboardWidget key={id} title="Migration Wizard" icon={Database} onViewAll={() => navigate('/migration')} emptyTitle="No imports yet" emptyDescription="Use Migration Wizard to import data." onEmptyAction={() => navigate('/migration')} emptyActionLabel="Open Wizard">
            <WidgetRow title="Spreadsheet migration available" subtitle="Import clients, cases, and documents" onClick={() => navigate('/migration')} />
          </DashboardWidget>
        );
      case 'ai_costs':
        return (
          <DashboardWidget key={id} title="AI Usage & Costs" icon={Sparkles} emptyTitle="" emptyDescription="">
            <WidgetRow title={`Est. cost: $${data.aiCostEstimate.toFixed(4)}`} subtitle={`${stats.pendingAiReview} pending review(s)`} onClick={() => navigate('/ai-intake')} />
          </DashboardWidget>
        );
      case 'notifications_summary':
        return (
          <DashboardWidget key={id} title="Notifications" icon={Bell} onViewAll={() => navigate('/notifications')} emptyTitle="No alerts" emptyDescription="">
            <WidgetRow title={`${stats.overdueDeadlines} overdue deadlines`} subtitle="View notification center" onClick={() => navigate('/notifications')} />
          </DashboardWidget>
        );
      case 'interviews_upcoming':
        return (
          <DashboardWidget key={id} title="Upcoming Interviews" icon={Calendar} emptyTitle="No interviews scheduled" emptyDescription="">
            {data.interviewsUpcoming.map((a) => (
              <WidgetRow key={a.id} title={a.title} subtitle={format(new Date(a.startTime), 'MMM d, h:mm a')} onClick={() => navigate('/calendar')} />
            ))}
          </DashboardWidget>
        );
      case 'biometrics_upcoming':
        return (
          <DashboardWidget key={id} title="Biometrics Appointments" icon={CalendarClock} emptyTitle="None scheduled" emptyDescription="">
            {data.biometricsUpcoming.map((d) => (
              <WidgetRow key={d.id} title={d.title} subtitle={format(new Date(d.date), 'MMM d, yyyy')} onClick={() => navigate('/deadlines')} />
            ))}
          </DashboardWidget>
        );
      case 'cases_by_stage':
        return (
          <div key={id} className="glass-card p-5 sm:p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" /> Cases by Stage
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.caseStageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'case_types_chart':
        return (
          <div key={id} className="glass-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Top Case Types</h3>
            <div className="space-y-4">
              {data.caseTypeData.map((item, i) => (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium">{item.name}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(item.value / (data.caseTypeData[0]?.value || 1)) * 100}%`, backgroundColor: PIE_COLORS[i] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'uscis_quick_access':
        return <div key={id} className="lg:col-span-2"><UscisQuickAccess cases={data.allCases} /></div>;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {widgets.map((id) => renderWidget(id))}
    </div>
  );
}
