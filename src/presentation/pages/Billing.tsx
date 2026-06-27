import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import type { Invoice } from '../../domain/models/Sales';
import { Receipt, Plus, X, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, cn } from '../../lib/utils';

const INVOICE_TYPES = ['Consultation Fee', 'Flat Fee', 'Installment', 'Retainer'];

const STATUS_CONFIG: Record<Invoice['status'], { label: string; color: string; bg: string }> = {
  'Draft':         { label: 'Draft',         color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800' },
  'Sent':          { label: 'Sent',          color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'Paid':          { label: 'Paid',          color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  'Partially Paid':{ label: 'Partial',       color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  'Overdue':       { label: 'Overdue',       color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20' },
};

export const Billing = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ clientId: '', amount: '', type: 'Flat Fee', status: 'Draft', dueDate: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [inv, cl] = await Promise.all([
          repos.invoices.getAll(tenantId),
          repos.clients.getAll(tenantId)
        ]);
        setInvoices(inv.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setClients(cl.map(c => ({ id: c.id, name: c.name })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (tenantId) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filtered = statusFilter ? invoices.filter(i => i.status === statusFilter) : invoices;

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = invoices.filter(i => ['Sent', 'Partially Paid', 'Overdue'].includes(i.status)).reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const overdue = invoices.filter(i => i.status === 'Overdue');

  const handleCreate = async () => {
    if (!form.clientId || !form.amount) return;
    const amount = parseFloat(form.amount);
    const newInv = await repos.invoices.create({
      tenantId, clientId: form.clientId, amount,
      paidAmount: 0, type: form.type as Invoice['type'],
      status: form.status as Invoice['status'],
      dueDate: form.dueDate ? new Date(form.dueDate) : new Date(),
      createdAt: new Date(), updatedAt: new Date()
    });
    setInvoices([newInv, ...invoices]);
    setShowModal(false);
    setForm({ clientId: '', amount: '', type: 'Flat Fee', status: 'Draft', dueDate: '' });
  };

  const handleMarkPaid = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    await repos.invoices.update(id, { status: 'Paid', paidAmount: inv.amount });
    setInvoices(invoices.map(i => i.id === id ? { ...i, status: 'Paid', paidAmount: inv.amount } : i));
  };

  if (loading) return <div className="p-8 text-gray-500">Loading billing...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-500" /> Billing & Invoices
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{invoices.length} invoices · {overdue.length} overdue</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Collected</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Outstanding</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(outstanding)}</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{overdue.length}</div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', 'Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              statusFilter === s
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-400")}>
            {s || 'All'} {s && `(${invoices.filter(i => i.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-800/30 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="px-5 py-3.5 font-semibold">Client</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Paid</th>
                <th className="px-5 py-3.5 font-semibold">Balance</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Due Date</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-500">No invoices found.</td></tr>
              ) : filtered.map(inv => {
                const cfg = STATUS_CONFIG[inv.status];
                const client = clients.find(c => c.id === inv.clientId);
                const balance = inv.amount - inv.paidAmount;
                return (
                  <tr key={inv.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {client?.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{client?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{inv.type}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(balance)}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", cfg.bg, cfg.color)}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{format(inv.dueDate, 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3.5 text-right">
                      {inv.status !== 'Paid' && (
                        <button onClick={() => handleMarkPaid(inv.id)}
                          className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md hover:bg-emerald-200 transition-colors">
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Invoice</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <input type="number" placeholder="2500" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
