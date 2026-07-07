import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Lead, LeadSource, LeadStatus } from '../../domain/models/CRM';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ActionMenu } from '../components/ui/ActionMenu';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  UserSquare2, Plus, Search, Eye, Pencil, UserPlus, Briefcase, UserCheck,
  Archive, Trash2, History, ArrowUpDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { design } from '../../lib/design';

const LEAD_STATUSES: LeadStatus[] = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
const LEAD_SOURCES: LeadSource[] = ['Website', 'Facebook', 'Instagram', 'Referral', 'WhatsApp', 'LinkedIn', 'Manual Entry'];
type SortKey = 'name' | 'date' | 'status';

const EMPTY_FORM = {
  name: '', company: '', email: '', phone: '', website: '',
  source: 'Manual Entry' as LeadSource, status: 'New Lead' as LeadStatus, notes: '', assignedUserId: '',
};

export const Leads = () => {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [historyItems, setHistoryItems] = useState<{ date: Date; text: string }[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const [data, userData] = await Promise.all([
        repos.leads.getAll(tenantId),
        repos.users.getAll(tenantId),
      ]);
      setLeads(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setUsers(userData.map((u) => ({ id: u.id, name: u.name })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) void loadLeads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let list = leads.filter((l) => {
      const matchSearch = !q || [l.name, l.company, l.email, l.phone].some((v) => v?.toLowerCase().includes(q));
      const matchStatus = !statusFilter || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [leads, searchQuery, statusFilter, sortKey, sortDir]);

  const openCreate = () => {
    setEditingLead(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      company: lead.company ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      website: lead.website ?? '',
      source: lead.source,
      status: lead.status,
      notes: lead.notes ?? '',
      assignedUserId: lead.assignedUserId ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setFormError('Please enter the lead name.');
      return false;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (editingLead) {
      const updated = await repos.leads.update(editingLead.id, {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        source: form.source,
        status: form.status,
        notes: form.notes.trim(),
        assignedUserId: form.assignedUserId || undefined,
        updatedAt: new Date(),
      });
      setLeads(leads.map((l) => (l.id === updated.id ? updated : l)));
      showToast('Lead saved.');
    } else {
      const created = await repos.leads.create({
        tenantId,
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        source: form.source,
        status: form.status,
        notes: form.notes.trim(),
        tags: [],
        assignedUserId: form.assignedUserId || user?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setLeads([created, ...leads]);
      showToast('New lead added.');
    }
    setShowForm(false);
    setEditingLead(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await repos.leads.delete(deleteTarget.id);
    setLeads(leads.filter((l) => l.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast('Lead deleted.');
  };

  const convertToClient = async (lead: Lead) => {
    await repos.clients.create({
      tenantId,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      notes: lead.notes,
      immigrationStatus: 'New Lead',
      lifetimeValue: 0,
      tags: [...lead.tags],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repos.leads.update(lead.id, { status: 'Won', updatedAt: new Date() });
    setLeads(leads.map((l) => (l.id === lead.id ? { ...l, status: 'Won' as LeadStatus } : l)));
    showToast(`${lead.name} is now a client.`);
    navigate('/clients');
  };

  const convertToCase = async (lead: Lead) => {
    let clientId = '';
    const existing = (await repos.clients.getAll(tenantId)).find((c) => c.email && c.email === lead.email);
    if (existing) {
      clientId = existing.id;
    } else {
      const client = await repos.clients.create({
        tenantId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        notes: lead.notes,
        immigrationStatus: 'Active Case',
        lifetimeValue: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      clientId = client.id;
    }
    await repos.cases.create({
      tenantId,
      name: `${lead.name} — New Case`,
      clientId,
      caseType: 'Other',
      stage: 'Assessment',
      value: 0,
      probability: 50,
      notes: lead.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repos.leads.update(lead.id, { status: 'Won', updatedAt: new Date() });
    showToast('Case created from lead.');
    navigate('/cases');
  };

  const archiveLead = async (lead: Lead) => {
    await repos.leads.update(lead.id, { status: 'Lost', updatedAt: new Date() });
    setLeads(leads.map((l) => (l.id === lead.id ? { ...l, status: 'Lost' as LeadStatus } : l)));
    showToast('Lead archived.');
  };

  const showHistory = async (lead: Lead) => {
    const activities = await repos.activities.getByEntity(tenantId, lead.id);
    setHistoryItems([
      { date: new Date(lead.createdAt), text: 'Lead created' },
      ...activities.map((a) => ({ date: new Date(a.createdAt), text: `${a.type}: ${a.description}` })),
      { date: new Date(lead.updatedAt), text: `Last updated · Status: ${lead.status}` },
    ].sort((a, b) => b.date.getTime() - a.date.getTime()));
    setHistoryLead(lead);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New Lead': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Contacted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Qualified': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Proposal Sent': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'Won': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Lost': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const leadMenuItems = (lead: Lead) => [
    { label: 'View Lead', icon: Eye, onClick: () => setViewLead(lead) },
    { label: 'Edit Lead', icon: Pencil, onClick: () => openEdit(lead) },
    { label: 'Convert to Client', icon: UserPlus, onClick: () => void convertToClient(lead) },
    { label: 'Convert to Case', icon: Briefcase, onClick: () => void convertToCase(lead) },
    { label: 'Assign Staff', icon: UserCheck, onClick: () => openEdit(lead) },
    { label: 'History', icon: History, onClick: () => void showHistory(lead) },
    { label: 'Archive', icon: Archive, onClick: () => void archiveLead(lead) },
    { label: 'Delete', icon: Trash2, destructive: true, onClick: () => setDeleteTarget(lead) },
  ];

  if (loading) return <PageSkeleton />;

  return (
    <div className={design.page}>
      <PageHeader
        title="Leads"
        description="Track potential clients from first contact to conversion."
        icon={UserSquare2}
        action={
          <button type="button" onClick={openCreate} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        }
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={UserSquare2}
          title="No leads yet"
          description="Add your first lead to start building your pipeline."
          actionLabel="Add Lead"
          onAction={openCreate}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(design.input, 'pl-9')}
                aria-label="Search leads"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cn(design.input, 'sm:max-w-[160px]')} aria-label="Filter by status">
              <option value="">All Statuses</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className={cn(design.btn.secondary, 'shrink-0')}
              aria-label="Toggle sort direction"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortKey === 'date' ? 'Date' : sortKey === 'name' ? 'Name' : 'Status'}
            </button>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={cn(design.input, 'sm:max-w-[120px]')} aria-label="Sort by">
              <option value="date">Sort: Date</option>
              <option value="name">Sort: Name</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>

          <div className="md:hidden space-y-3">
            {filteredLeads.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No leads match your search.</p>
            ) : filteredLeads.map((lead) => (
              <article key={lead.id} className="glass-card p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{lead.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{lead.email || lead.phone || '—'}</p>
                  </div>
                  <ActionMenu items={leadMenuItems(lead)} ariaLabel={`Actions for ${lead.name}`} />
                </div>
                <span className={cn('inline-block text-xs font-medium px-2.5 py-1 rounded-full', getStatusColor(lead.status))}>{lead.status}</span>
                <p className="text-xs text-gray-400">{lead.source} · {format(lead.createdAt, 'MMM d, yyyy')}</p>
              </article>
            ))}
          </div>

          <div className="glass-card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/95 dark:bg-gray-900/95 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-3.5 font-semibold">Name</th>
                    <th className="px-4 py-3.5 font-semibold">Contact</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                    <th className="px-4 py-3.5 font-semibold">Source</th>
                    <th className="px-4 py-3.5 font-semibold">Added</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredLeads.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No leads match your search.</td></tr>
                  ) : filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <button type="button" onClick={() => setViewLead(lead)} className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 text-left">
                          {lead.name}
                        </button>
                        <div className="text-sm text-gray-500">{lead.company || '—'}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        <div>{lead.email || '—'}</div>
                        <div className="text-gray-500">{lead.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full', getStatusColor(lead.status))}>{lead.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{lead.source}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{format(lead.createdAt, 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3.5 text-right">
                        <ActionMenu items={leadMenuItems(lead)} ariaLabel={`Actions for ${lead.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingLead ? 'Edit Lead' : 'Add Lead'}
        footer={
          <>
            <button type="button" onClick={() => setShowForm(false)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button>
            <button type="button" onClick={() => void handleSave()} className={cn(design.btn.primary, 'flex-1')}>Save</button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{formError}</p>}
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={design.input} placeholder="Maria Garcia" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={design.input} placeholder="maria@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={design.input} placeholder="(555) 000-0000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Company</label>
            <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={design.input} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })} className={design.input}>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })} className={design.input}>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Assigned Staff</label>
            <select value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })} className={design.input}>
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={design.input} placeholder="How did they find us? What do they need?" />
          </div>
        </div>
      </Modal>

      <Modal open={!!viewLead} onClose={() => setViewLead(null)} title={viewLead?.name ?? 'Lead Details'} size="lg">
        {viewLead && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">Email</dt><dd className="font-medium mt-0.5">{viewLead.email || '—'}</dd></div>
            <div><dt className="text-gray-500">Phone</dt><dd className="font-medium mt-0.5">{viewLead.phone || '—'}</dd></div>
            <div><dt className="text-gray-500">Company</dt><dd className="font-medium mt-0.5">{viewLead.company || '—'}</dd></div>
            <div><dt className="text-gray-500">Status</dt><dd className="mt-0.5"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(viewLead.status))}>{viewLead.status}</span></dd></div>
            <div><dt className="text-gray-500">Source</dt><dd className="font-medium mt-0.5">{viewLead.source}</dd></div>
            <div><dt className="text-gray-500">Added</dt><dd className="font-medium mt-0.5">{format(viewLead.createdAt, 'MMM d, yyyy')}</dd></div>
            {viewLead.notes && <div className="sm:col-span-2"><dt className="text-gray-500">Notes</dt><dd className="mt-0.5 text-gray-700 dark:text-gray-300">{viewLead.notes}</dd></div>}
          </dl>
        )}
      </Modal>

      <Modal open={!!historyLead} onClose={() => setHistoryLead(null)} title={historyLead ? `${historyLead.name} — History` : 'History'} size="lg">
        <ol className="space-y-3">
          {historyItems.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <time className="text-gray-400 shrink-0 w-24">{format(item.date, 'MMM d, yyyy')}</time>
              <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
            </li>
          ))}
        </ol>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Lead?"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
