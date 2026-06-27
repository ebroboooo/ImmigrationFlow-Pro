import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import type { Task, Activity, Invoice, Deadline, Appointment } from '../../domain/models/Sales';
import type { Client } from '../../domain/models/CRM';
import {
  Users, FileText, AlertCircle, CalendarClock, DollarSign, CheckSquare,
  Activity as ActivityIcon, Calendar, Receipt, Plus, ArrowRight,
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { format, isToday, isWithinInterval, addDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard = () => {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0, activeCases: 0, pendingUSCIS: 0, overdueDeadlines: 0,
    pendingDocuments: 0, revenueThisMonth: 0, openInvoices: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([]);
  const [caseStageData, setCaseStageData] = useState<{ name: string; count: number }[]>([]);
  const [caseTypeData, setCaseTypeData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [
          allClients, allCases, allTasks, allActivities, allDeadlines,
          allDocuments, allInvoices, allAppointments,
        ] = await Promise.all([
          repos.clients.getAll(tenantId),
          repos.cases.getAll(tenantId),
          repos.tasks.getAll(tenantId),
          repos.activities.getAll(tenantId),
          repos.deadlines.getAll(tenantId),
          repos.documents.getAll(tenantId),
          repos.invoices.getAll(tenantId),
          repos.appointments.getAll(tenantId),
        ]);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const activeCases = allCases.filter(c => !['Closed', 'Denied'].includes(c.stage));
        const pendingUSCIS = allCases.filter(c => c.stage === 'Pending USCIS');
        const overdueDeadlines = allDeadlines.filter(d => d.status === 'Pending' && new Date(d.date) < now);
        const pendingDocs = allDocuments.filter(d => d.status === 'Pending');
        const monthRevenue = allInvoices.filter(i => i.status === 'Paid' && new Date(i.createdAt) >= startOfMonth)
          .reduce((s, i) => s + i.paidAmount, 0);
        const unpaid = allInvoices.filter(i => !['Paid', 'Draft'].includes(i.status));

        setStats({
          totalClients: allClients.length,
          activeCases: activeCases.length,
          pendingUSCIS: pendingUSCIS.length,
          overdueDeadlines: overdueDeadlines.length,
          pendingDocuments: pendingDocs.length,
          revenueThisMonth: monthRevenue,
          openInvoices: unpaid.length,
        });

        setTasks(allTasks.filter(t => t.assignedUserId === user?.id || !t.assignedUserId)
          .filter(t => t.status !== 'Completed').slice(0, 5));
        setActivities(allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6));
        setTodayAppointments(allAppointments.filter(a =>
          a.status !== 'Cancelled' && isToday(new Date(a.startTime))
        ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 5));
        setUpcomingDeadlines(allDeadlines.filter(d =>
          d.status === 'Pending' && isWithinInterval(new Date(d.date), { start: now, end: addDays(now, 14) })
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5));
        setRecentClients([...allClients].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5));
        setOpenInvoices(unpaid.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5));

        const stages = ['Assessment', 'Preparation', 'Filed', 'Pending USCIS', 'RFE Received', 'Approved'];
        setCaseStageData(stages.map(stage => ({
          name: stage.replace('Pending USCIS', 'USCIS').replace('Assessment', 'Assess.'),
          count: allCases.filter(c => c.stage === stage).length,
        })));

        const typeMap: Record<string, number> = {};
        allCases.forEach(c => { typeMap[c.caseType] = (typeMap[c.caseType] || 0) + 1; });
        setCaseTypeData(Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value })));
      } catch (error) {
        console.error('Error loading dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, user?.id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
  const kpiCards = [
    { title: 'Total Clients', value: stats.totalClients, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10', trend: 'Active & archived' },
    { title: 'Active Cases', value: stats.activeCases, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 'In progress' },
    { title: 'Pending USCIS', value: stats.pendingUSCIS, icon: CalendarClock, color: 'text-purple-500', bg: 'bg-purple-500/10', trend: 'Awaiting decision' },
    { title: 'Revenue (Month)', value: formatCurrency(stats.revenueThisMonth), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 'Collected' },
    { title: 'Overdue Deadlines', value: stats.overdueDeadlines, icon: AlertCircle, color: stats.overdueDeadlines > 0 ? 'text-red-500' : 'text-gray-400', bg: stats.overdueDeadlines > 0 ? 'bg-red-500/10' : 'bg-gray-500/10', trend: stats.overdueDeadlines > 0 ? 'Action needed' : 'All good' },
    { title: 'Missing Documents', value: stats.pendingDocuments, icon: AlertCircle, color: stats.pendingDocuments > 0 ? 'text-amber-500' : 'text-gray-400', bg: stats.pendingDocuments > 0 ? 'bg-amber-500/10' : 'bg-gray-500/10', trend: 'Client uploads pending' },
  ];

  const quickActions = [
    { label: 'Add Client', icon: Users, path: '/clients', color: 'bg-indigo-600' },
    { label: 'New Case', icon: FileText, path: '/cases', color: 'bg-blue-600' },
    { label: 'Schedule', icon: Calendar, path: '/calendar', color: 'bg-purple-600' },
    { label: 'Create Invoice', icon: Receipt, path: '/billing', color: 'bg-emerald-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, <span className="font-medium text-indigo-500">{user?.name}</span>. Here is your firm overview.
          </p>
        </div>
        <div className="text-xs text-gray-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(action => (
          <button key={action.label} onClick={() => navigate(action.path)}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-400 transition-all group">
            <div className={cn("p-2 rounded-lg text-white", action.color)}>
              <action.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600">{action.label}</span>
            <Plus className="w-3 h-3 ml-auto text-gray-400 opacity-0 group-hover:opacity-100" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="glass-card p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">{kpi.title}</p>
              <div className={cn("p-1.5 rounded-lg", kpi.bg)}>
                <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</div>
            <div className="text-xs text-gray-400">{kpi.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Widget title="Today's Appointments" icon={Calendar} onViewAll={() => navigate('/calendar')} empty="No appointments today.">
          {todayAppointments.map(a => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-gray-500">{format(new Date(a.startTime), 'h:mm a')} · {a.type}</p>
              </div>
            </div>
          ))}
        </Widget>

        <Widget title="Upcoming Deadlines" icon={CalendarClock} onViewAll={() => navigate('/deadlines')} empty="No deadlines in the next 14 days.">
          {upcomingDeadlines.map(d => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{d.title}</p>
                <p className="text-xs text-gray-500">{d.type} · {format(new Date(d.date), 'MMM d, yyyy')}</p>
              </div>
            </div>
          ))}
        </Widget>

        <Widget title="Open Invoices" icon={Receipt} onViewAll={() => navigate('/billing')} empty="All invoices are paid.">
          {openInvoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(inv.amount - inv.paidAmount)} due</p>
                <p className="text-xs text-gray-500">{inv.status} · Due {format(new Date(inv.dueDate), 'MMM d')}</p>
              </div>
            </div>
          ))}
        </Widget>

        <Widget title="Recent Clients" icon={Users} onViewAll={() => navigate('/clients')} empty="No clients yet.">
          {recentClients.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                <p className="text-xs text-gray-500">{c.immigrationStatus || 'New Lead'} · {c.nationality || '—'}</p>
              </div>
            </div>
          ))}
        </Widget>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 lg:col-span-2 flex flex-col">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Cases by Stage
          </h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caseStageData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#4f46e5', opacity: 0.1 }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Top Case Types</h3>
          {caseTypeData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <div className="space-y-3 flex-1">
              {caseTypeData.map((item, i) => {
                const max = caseTypeData[0].value;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                      <span className="text-gray-500">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: PIE_COLORS[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-indigo-500" /> My Tasks
          </h3>
          <div className="space-y-2 flex-1">
            {tasks.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">You are all caught up.</div>
            ) : tasks.map(task => (
              <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-gray-400')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{task.type} · Due {task.dueDate ? format(task.dueDate, 'MMM d') : 'TBD'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-cyan-500" /> Recent Activity
          </h3>
          <div className="space-y-3 flex-1">
            {activities.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6">No recent activity.</div>
            ) : activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-tight">
                    <span className="font-medium capitalize">{activity.type}</span>: {activity.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{format(activity.createdAt, 'MMM d, h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Widget = ({ title, icon: Icon, children, empty, onViewAll }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  empty: string;
  onViewAll: () => void;
}) => {
  const hasContent = React.Children.count(children) > 0;
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-500" /> {title}
        </h3>
        <button onClick={onViewAll} className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
          View all <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      {!hasContent ? <p className="text-sm text-gray-500 py-4">{empty}</p> : children}
    </div>
  );
};
