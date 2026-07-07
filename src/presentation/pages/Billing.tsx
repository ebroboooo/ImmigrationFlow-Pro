import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Invoice } from '../../domain/models/Sales';
import { Receipt, Plus, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, cn } from '../../lib/utils';
import { design } from '../../lib/design';
import { PageSkeleton } from '../components/ui/Skeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const INVOICE_TYPES = ['Consultation Fee', 'Flat Fee', 'Installment', 'Retainer'];

const STATUS_CONFIG: Record<Invoice['status'], { label: string; color: string; bg: string }> = {
  Draft: { label: 'Draft', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  Sent: { label: 'Sent', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  Paid: { label: 'Paid', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  'Partially Paid': { label: 'Partial', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  Overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
};

export const Billing = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null);
  const [form, setForm] = useState({ clientId: '', amount: '', type: 'Flat Fee', status: 'Draft', dueDate: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [inv, cl] = await Promise.all([
          repos.invoices.getAll(tenantId),
          repos.clients.getAll(tenantId),
        ]);
        setInvoices(inv.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setClients(cl.map(c => ({ id: c.id, name: c.name })));
      } catch {
        showToast('Could not load invoices. Please refresh the page.', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filtered = statusFilter ? invoices.filter(i => i.status === statusFilter) : invoices;

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = invoices.filter(i => ['Sent', 'Partially Paid', 'Overdue'].includes(i.status)).reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const overdueCount = invoices.filter(i => i.status === 'Overdue').length;

  const handleCreate = async () => {
    if (!form.clientId) {
      setFormError('Please select a client.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    setFormError('');
    const amount = parseFloat(form.amount);
    const newInv = await repos.invoices.create({
      tenantId,
      clientId: form.clientId,
      amount,
      paidAmount: 0,
      type: form.type as Invoice['type'],
      status: form.status as Invoice['status'],
      dueDate: form.dueDate ? new Date(form.dueDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setInvoices([newInv, ...invoices]);
    setShowModal(false);
    setForm({ clientId: '', amount: '', type: 'Flat Fee', status: 'Draft', dueDate: '' });
    showToast('Invoice created successfully.');
  };

  const handleMarkPaid = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    await repos.invoices.update(id, { status: 'Paid', paidAmount: inv.amount });
    setInvoices(invoices.map(i => (i.id === id ? { ...i, status: 'Paid', paidAmount: inv.amount } : i)));
    setConfirmPaidId(null);
    showToast('Invoice marked as paid.');
  };

  if (loading) return <PageSkeleton />;

  const confirmInvoice = confirmPaidId ? invoices.find(i => i.id === confirmPaidId) : null;
  const confirmClient = confirmInvoice ? clients.find(c => c.id === confirmInvoice.clientId) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Billing & Invoices"
        description={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} · ${overdueCount} overdue`}
        icon={Receipt}
        action={
          <button type="button" onClick={() => setShowModal(true)} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
            <Plus className="w-5 h-5" /> New Invoice
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-base text-gray-500 dark:text-gray-400">Total Collected</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-base text-gray-500 dark:text-gray-400">Outstanding</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(outstanding)}</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-base text-gray-500 dark:text-gray-400">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{overdueCount}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue'].map(s => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'min-h-11 px-4 py-2 rounded-lg text-base font-medium transition-colors',
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-400',
            )}
          >
            {s || 'All'} {s && `(${invoices.filter(i => i.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={statusFilter ? 'No invoices match this filter' : 'No invoices yet'}
          description={statusFilter ? 'Try a different status filter or create a new invoice.' : 'Create invoices for consultation fees, flat fees, retainers, and installments.'}
          actionLabel={statusFilter ? undefined : 'Create First Invoice'}
          onAction={statusFilter ? undefined : () => setShowModal(true)}
        />
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {filtered.map(inv => (
              <InvoiceCard
                key={inv.id}
                inv={inv}
                clientName={clients.find(c => c.id === inv.clientId)?.name ?? 'Unknown client'}
                onMarkPaid={() => setConfirmPaidId(inv.id)}
              />
            ))}
          </div>

          <div className="hidden lg:block glass-card overflow-hidden">
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
                  {filtered.map(inv => {
                    const cfg = STATUS_CONFIG[inv.status];
                    const client = clients.find(c => c.id === inv.clientId);
                    const balance = inv.amount - inv.paidAmount;
                    return (
                      <tr key={inv.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                              {client?.name?.charAt(0) || '?'}
                            </div>
                            <span className="font-medium text-base text-gray-900 dark:text-white">{client?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-base text-gray-600 dark:text-gray-400">{inv.type}</td>
                        <td className="px-5 py-3.5 text-base font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.amount)}</td>
                        <td className="px-5 py-3.5 text-base text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                        <td className="px-5 py-3.5 text-base font-medium text-gray-900 dark:text-white">{formatCurrency(balance)}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn('text-sm font-medium px-2.5 py-1 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-base text-gray-500">{format(inv.dueDate, 'MMM d, yyyy')}</td>
                        <td className="px-5 py-3.5 text-right">
                          {inv.status !== 'Paid' && (
                            <button type="button" onClick={() => setConfirmPaidId(inv.id)} className="min-h-10 px-3 py-2 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors">
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
        </>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setFormError(''); }}
        title="New Invoice"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button>
            <button type="button" onClick={() => void handleCreate()} className={cn(design.btn.primary, 'flex-1')}>Create Invoice</button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-base text-red-600 dark:text-red-400" role="alert">{formError}</p>}
          <div>
            <label htmlFor="inv-client" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
            <select id="inv-client" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className={design.input}>
              <option value="">Select a client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-amount" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <input id="inv-amount" type="number" min="0" step="0.01" placeholder="2500" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={design.input} />
            </div>
            <div>
              <label htmlFor="inv-type" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select id="inv-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={design.input}>
                {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-status" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select id="inv-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={design.input}>
                {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inv-due" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input id="inv-due" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className={design.input} />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmPaidId}
        title="Mark invoice as paid?"
        message={confirmInvoice ? `Confirm payment of ${formatCurrency(confirmInvoice.amount)} from ${confirmClient?.name ?? 'this client'}.` : 'Confirm this payment.'}
        confirmLabel="Mark as Paid"
        onConfirm={() => confirmPaidId && void handleMarkPaid(confirmPaidId)}
        onCancel={() => setConfirmPaidId(null)}
      />
    </div>
  );
};

function InvoiceCard({
  inv,
  clientName,
  onMarkPaid,
}: {
  inv: Invoice;
  clientName: string;
  onMarkPaid: () => void;
}) {
  const cfg = STATUS_CONFIG[inv.status];
  const balance = inv.amount - inv.paidAmount;
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-base text-gray-900 dark:text-white">{clientName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{inv.type} · Due {format(inv.dueDate, 'MMM d, yyyy')}</p>
        </div>
        <span className={cn('text-sm font-medium px-2.5 py-1 rounded-full shrink-0', cfg.bg, cfg.color)}>{cfg.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-500">Amount</p>
          <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Paid</p>
          <p className="font-semibold text-emerald-600">{formatCurrency(inv.paidAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Balance</p>
          <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(balance)}</p>
        </div>
      </div>
      {inv.status !== 'Paid' && (
        <button type="button" onClick={onMarkPaid} className={cn(design.btn.primary, 'w-full')}>
          Mark as Paid
        </button>
      )}
    </div>
  );
}
