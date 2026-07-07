import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import type { Client } from '../../domain/models/CRM';
import { Users, Plus, Search, X, Globe, CreditCard, FileText, Phone, Mail, History, Bot } from 'lucide-react';
import { CaseCopilotPanel } from '../components/ai/copilot/CaseCopilotPanel';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ClientTimelinePanel } from '../components/timeline/ClientTimelinePanel';
import { EmptyState } from '../components/ui/EmptyState';
import { design } from '../../lib/design';

const STATUS_COLORS: Record<string, string> = {
  'New Lead': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Consultation Scheduled': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Active Case': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Waiting For Documents': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Filed': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Pending USCIS': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Denied': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Closed': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const ALL_STATUSES = ['New Lead','Consultation Scheduled','Active Case','Waiting For Documents','Filed','Pending USCIS','Approved','Denied','Closed'];

export const Clients = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [timelineClient, setTimelineClient] = useState<Client | null>(null);
  const [copilotClient, setCopilotClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', nationality: '', immigrationStatus: 'New Lead', aNumber: '', passportNumber: '' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await repos.clients.getAll(tenantId);
        setClients(data);
      } catch {
        /* load failed */
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filtered = clients.filter(c => {
    const matchSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.aNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || c.immigrationStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!form.name) return;
    const newClient = await repos.clients.create({
      tenantId, name: form.name, email: form.email, phone: form.phone,
      nationality: form.nationality, immigrationStatus: form.immigrationStatus,
      aNumber: form.aNumber, passportNumber: form.passportNumber,
      notes: '', lifetimeValue: 0, tags: [], createdAt: new Date(), updatedAt: new Date()
    });
    setClients([newClient, ...clients]);
    setShowModal(false);
    setForm({ name: '', email: '', phone: '', nationality: '', immigrationStatus: 'New Lead', aNumber: '', passportNumber: '' });
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className={design.page}>
      <PageHeader
        title="Client Management"
        description={`${clients.length} total clients · ${clients.filter((c) => c.immigrationStatus === 'Active Case').length} active cases`}
        icon={Users}
        action={
          <button type="button" onClick={() => setShowModal(true)} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
            <Plus className="w-4 h-4" /> Add Client
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, email, A-Number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white">
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {['Active Case','Pending USCIS','Waiting For Documents','Approved','Denied'].map(status => (
          <button key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            className={cn("rounded-xl p-3 border text-left transition-all", statusFilter === status ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-gray-200 dark:border-gray-800",
              "bg-white dark:bg-gray-900 hover:border-indigo-400")}>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{clients.filter(c => c.immigrationStatus === status).length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{status}</div>
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500 dark:text-gray-400">No clients found.</div>
        ) : filtered.map(client => (
          <article key={client.id} className="glass-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold shrink-0">
                {client.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{client.name}</h3>
                <span className={cn("inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full", STATUS_COLORS[client.immigrationStatus || 'New Lead'] || STATUS_COLORS['New Lead'])}>
                  {client.immigrationStatus || 'New Lead'}
                </span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div><dt className="text-xs text-gray-500">Nationality</dt><dd className="text-gray-800 dark:text-gray-200 truncate">{client.nationality || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">A-Number</dt><dd className="font-mono text-gray-800 dark:text-gray-200 truncate">{client.aNumber || '—'}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-gray-500">Email</dt><dd className="text-gray-800 dark:text-gray-200 break-all">{client.email || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Phone</dt><dd className="text-gray-800 dark:text-gray-200">{client.phone || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Added</dt><dd className="text-gray-800 dark:text-gray-200">{format(client.createdAt, 'MMM d, yyyy')}</dd></div>
            </dl>
            <button
              type="button"
              onClick={() => setCopilotClient(client)}
              className={cn(design.btn.secondary, 'w-full text-xs mt-1')}
            >
              <Bot className="w-3.5 h-3.5" /> AI Copilot
            </button>
            <button
              type="button"
              onClick={() => setTimelineClient(client)}
              className={cn(design.btn.secondary, 'w-full text-xs')}
            >
              <History className="w-3.5 h-3.5" /> View Timeline
            </button>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-800/30 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="px-5 py-3.5 font-semibold">Client</th>
                <th className="px-5 py-3.5 font-semibold">Nationality</th>
                <th className="px-5 py-3.5 font-semibold">A-Number</th>
                <th className="px-5 py-3.5 font-semibold">Contact</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Added</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10">
                  <EmptyState icon={Users} title="No clients found" description="Try adjusting your search or filters." actionLabel="Add Client" onAction={() => setShowModal(true)} compact />
                </td></tr>
              ) : filtered.map(client => (
                <tr key={client.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1"><FileText className="w-3 h-3" /> {client.passportNumber || 'No passport'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <Globe className="w-3.5 h-3.5 text-gray-400" /> {client.nationality || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm font-mono text-gray-700 dark:text-gray-300">
                      <CreditCard className="w-3.5 h-3.5 text-gray-400" /> {client.aNumber || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300"><Mail className="w-3 h-3 text-gray-400" /> {client.email || '—'}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" /> {client.phone || '—'}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STATUS_COLORS[client.immigrationStatus || 'New Lead'] || STATUS_COLORS['New Lead'])}>
                      {client.immigrationStatus || 'New Lead'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                    {format(client.createdAt, 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCopilotClient(client)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline min-h-11 px-2"
                      >
                        <Bot className="w-3.5 h-3.5" /> Copilot
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimelineClient(client)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline min-h-11 px-2"
                      >
                        <History className="w-3.5 h-3.5" /> Timeline
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92dvh] overflow-y-auto safe-bottom">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Client</h2>
              <button onClick={() => setShowModal(false)} aria-label="Close" className="min-h-11 min-w-11 flex items-center justify-center text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'John Smith' },
                { label: 'Email', key: 'email', placeholder: 'john@example.com' },
                { label: 'Phone', key: 'phone', placeholder: '+1 (555) 000-0000' },
                { label: 'Nationality', key: 'nationality', placeholder: 'Mexico' },
                { label: 'A-Number', key: 'aNumber', placeholder: 'A-123456789' },
                { label: 'Passport Number', key: 'passportNumber', placeholder: 'P12345678' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                  <input type="text" placeholder={field.placeholder} value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full min-h-11 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Immigration Status</label>
                <select value={form.immigrationStatus} onChange={e => setForm({ ...form, immigrationStatus: e.target.value })}
                  className="w-full min-h-11 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
              <button onClick={() => setShowModal(false)} className="flex-1 min-h-11 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleCreate} className="flex-1 min-h-11 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Add Client</button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!copilotClient}
        onClose={() => setCopilotClient(null)}
        title={copilotClient ? `${copilotClient.name} — AI Copilot` : 'AI Copilot'}
        size="lg"
      >
        {copilotClient && (
          <CaseCopilotPanel
            scope={{ type: 'client', clientId: copilotClient.id }}
            title={copilotClient.name}
          />
        )}
      </Modal>

      <Modal
        open={!!timelineClient}
        onClose={() => setTimelineClient(null)}
        title={timelineClient ? `${timelineClient.name} — Timeline` : 'Timeline'}
        size="lg"
      >
        {timelineClient && <ClientTimelinePanel client={timelineClient} />}
      </Modal>
    </div>
  );
};

