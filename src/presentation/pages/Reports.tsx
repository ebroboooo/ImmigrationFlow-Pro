import { useState, useEffect, useMemo } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Download, TrendingUp, Users, FileText, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { PageSkeleton } from '../components/ui/Skeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { downloadCsv } from '../../lib/exportData';
import { design } from '../../lib/design';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

type DateFilter = 'Week' | 'Month' | 'Year';

function getFilterStart(filter: DateFilter): Date {
  const now = new Date();
  if (filter === 'Week') return startOfWeek(now);
  if (filter === 'Month') return startOfMonth(now);
  return startOfYear(now);
}

export const Reports = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('Month');

  const [metrics, setMetrics] = useState({
    totalRevenue: 0, totalClients: 0, activeCases: 0, approvalRate: 0,
    denialRate: 0, outstandingPayments: 0, avgProcessingDays: 0, leadConversion: 0,
  });

  const [charts, setCharts] = useState({
    revenueData: [] as { name: string; revenue: number }[],
    caseTypeData: [] as { name: string; count: number }[],
    pipelineData: [] as { name: string; count: number }[],
  });

  const filterStart = useMemo(() => getFilterStart(dateFilter), [dateFilter]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [allCases, allClients, allInvoices, allLeads, allDocuments, allUsers, allTasks] = await Promise.all([
          repos.cases.getAll(tenantId),
          repos.clients.getAll(tenantId),
          repos.invoices.getAll(tenantId),
          repos.leads.getAll(tenantId),
          repos.documents.getAll(tenantId),
          repos.users.getAll(tenantId),
          repos.tasks.getAll(tenantId),
        ]);

        const filteredCases = allCases.filter(c => new Date(c.createdAt) >= filterStart);
        const filteredInvoices = allInvoices.filter(i => new Date(i.createdAt) >= filterStart);
        const paidInvoices = filteredInvoices.filter(i => i.status === 'Paid');
        const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
        const outstanding = allInvoices.filter(i => !['Paid', 'Draft'].includes(i.status))
          .reduce((s, i) => s + (i.amount - i.paidAmount), 0);

        const closedCases = allCases.filter(c => c.stage === 'Approved' || c.stage === 'Denied');
        const approvedCases = allCases.filter(c => c.stage === 'Approved');
        const deniedCases = allCases.filter(c => c.stage === 'Denied');
        const approvalRate = closedCases.length > 0 ? Math.round((approvedCases.length / closedCases.length) * 100) : 0;
        const denialRate = closedCases.length > 0 ? Math.round((deniedCases.length / closedCases.length) * 100) : 0;

        const wonLeads = allLeads.filter(l => l.status === 'Won').length;
        const leadConversion = allLeads.length > 0 ? Math.round((wonLeads / allLeads.length) * 100) : 0;

        const completedCases = allCases.filter(c => ['Approved', 'Denied', 'Closed'].includes(c.stage));
        const avgProcessingDays = completedCases.length > 0
          ? Math.round(completedCases.reduce((s, c) => s + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / 86400000, 0) / completedCases.length)
          : 0;

        const docCompletion = allDocuments.length > 0
          ? Math.round((allDocuments.filter(d => d.status === 'Reviewed').length / allDocuments.length) * 100)
          : 0;

        setMetrics({
          totalRevenue,
          totalClients: allClients.length,
          activeCases: allCases.filter(c => !['Closed', 'Denied'].includes(c.stage)).length,
          approvalRate,
          denialRate,
          outstandingPayments: outstanding,
          avgProcessingDays,
          leadConversion: docCompletion > 0 ? docCompletion : leadConversion,
        });

        const revenueData = Array.from({ length: 6 }).map((_, i) => {
          const monthDate = subDays(new Date(), (5 - i) * 30);
          const monthRev = allInvoices.filter(i => i.status === 'Paid').filter(inv => {
            const d = new Date(inv.createdAt);
            return d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
          }).reduce((s, inv) => s + inv.paidAmount, 0);
          return { name: format(monthDate, 'MMM'), revenue: monthRev };
        });

        const typeMap: Record<string, number> = {};
        filteredCases.forEach(c => { typeMap[c.caseType] = (typeMap[c.caseType] || 0) + 1; });
        const caseTypeData = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

        const stages = ['Assessment', 'Preparation', 'Filed', 'Pending USCIS', 'RFE Received', 'Approved'];
        const pipelineData = stages.map(stage => ({
          name: stage.replace('Pending USCIS', 'USCIS').replace('Assessment', 'Assess.').replace('Preparation', 'Prep.'),
          count: allCases.filter(c => c.stage === stage).length,
        }));

        setCharts({ revenueData, caseTypeData, pipelineData });

        void allUsers;
        void allTasks;
      } catch {
        // metrics remain at defaults
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, dateFilter]);

  const handleExportCsv = async () => {
    const [cases, invoices] = await Promise.all([
      repos.cases.getAll(tenantId),
      repos.invoices.getAll(tenantId),
    ]);
    downloadCsv(
      cases.map(c => ({
        Case: c.name, Type: c.caseType, Stage: c.stage,
        Value: c.value, Receipt: c.uscisReceiptNumber || '',
        Created: format(new Date(c.createdAt), 'yyyy-MM-dd'),
      })),
      `cases-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    );
    downloadCsv(
      invoices.map(i => ({
        Amount: i.amount, Paid: i.paidAmount, Status: i.status,
        Type: i.type, Due: format(new Date(i.dueDate), 'yyyy-MM-dd'),
      })),
      `invoices-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    );
  };

  const kpiCards = [
    { title: 'Total Revenue', value: formatCurrency(metrics.totalRevenue), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Active Cases', value: metrics.activeCases, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Approval Rate', value: `${metrics.approvalRate}%`, icon: CheckCircle, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { title: 'Denial Rate', value: `${metrics.denialRate}%`, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Outstanding', value: formatCurrency(metrics.outstandingPayments), icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Avg Processing', value: `${metrics.avgProcessingDays}d`, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Total Clients', value: metrics.totalClients, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Doc Completion', value: `${metrics.leadConversion}%`, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <PageHeader
        title="Reports & Analytics"
        description="Immigration firm performance metrics and case analytics."
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['Week', 'Month', 'Year'] as DateFilter[]).map(f => (
                <button key={f} type="button" onClick={() => setDateFilter(f)}
                  className={cn('min-h-10 px-4 py-1.5 rounded-md text-base font-medium transition-colors',
                    dateFilter === f ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white')}>
                  {f}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleExportCsv} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
              <Download className="w-5 h-5" /> Export CSV
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="glass-card p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">{kpi.value}</h3>
              </div>
              <div className={cn("p-2.5 rounded-lg", kpi.bg, kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue (Last 6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(v) => [formatCurrency(Number(v) || 0), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cases by Stage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.pipelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#4f46e5', opacity: 0.1 }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cases by Immigration Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.caseTypeData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.2} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} width={120} />
                <Tooltip cursor={{ fill: '#8b5cf6', opacity: 0.1 }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
