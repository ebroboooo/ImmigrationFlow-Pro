import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Deadline } from '../../domain/models/Sales';
import { CalendarClock, AlertTriangle, Plus, CheckCircle, Clock, Bell, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '../../lib/utils';
import { design } from '../../lib/design';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const DEADLINE_TYPES = ['USCIS Deadline', 'RFE Deadline', 'Court Deadline', 'Interview Date', 'Biometric Appointment', 'Expiration Date', 'Filing Deadline'];

function getDaysUrgency(date: Date) {
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', dot: 'bg-red-500' };
  if (days <= 7) return { label: `${days} day${days === 1 ? '' : 's'}`, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', dot: 'bg-red-500' };
  if (days <= 14) return { label: `${days} days`, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' };
  if (days <= 30) return { label: `${days} days`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', dot: 'bg-amber-400' };
  return { label: `${days} days`, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800', dot: 'bg-gray-400' };
}

export const Deadlines = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const { showToast } = useToast();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', type: 'USCIS Deadline', date: '' });
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await repos.deadlines.getAll(tenantId);
      setDeadlines(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch {
      showToast('Could not load deadlines. Please refresh the page.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setFormError('Please enter a deadline title.');
      return;
    }
    if (!form.date) {
      setFormError('Please select a due date.');
      return;
    }
    setFormError('');
    const newDeadline = await repos.deadlines.create({
      tenantId,
      title: form.title.trim(),
      type: form.type as Deadline['type'],
      date: new Date(form.date),
      status: 'Pending',
      createdAt: new Date(),
    });
    setDeadlines([...deadlines, newDeadline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setShowModal(false);
    setForm({ title: '', type: 'USCIS Deadline', date: '' });
    showToast('Deadline added successfully.');
  };

  const handleMarkMet = async (id: string) => {
    await repos.deadlines.update(id, { status: 'Met' });
    setDeadlines(deadlines.map(d => (d.id === id ? { ...d, status: 'Met' } : d)));
    showToast('Deadline marked as completed.');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await repos.deadlines.delete(deleteId);
    setDeadlines(deadlines.filter(d => d.id !== deleteId));
    setDeleteId(null);
    showToast('Deadline removed.');
  };

  const overdue = deadlines.filter(d => d.status === 'Pending' && differenceInDays(new Date(d.date), new Date()) < 0);
  const critical = deadlines.filter(d => d.status === 'Pending' && differenceInDays(new Date(d.date), new Date()) >= 0 && differenceInDays(new Date(d.date), new Date()) <= 7);
  const upcoming = deadlines.filter(d => d.status === 'Pending' && differenceInDays(new Date(d.date), new Date()) > 7);
  const met = deadlines.filter(d => d.status === 'Met');

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Deadline Center"
        description={`${overdue.length} overdue · ${critical.length} due within 7 days · ${upcoming.length} upcoming`}
        icon={CalendarClock}
        action={
          <button type="button" onClick={() => setShowModal(true)} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
            <Plus className="w-5 h-5" /> Add Deadline
          </button>
        }
      />

      {deadlines.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No deadlines yet"
          description="Track USCIS filing dates, RFE responses, court hearings, and other important dates for your cases."
          actionLabel="Add Your First Deadline"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Overdue', count: overdue.length, dot: 'bg-red-500' },
              { label: 'Due This Week', count: critical.length, dot: 'bg-orange-500' },
              { label: 'Upcoming', count: upcoming.length, dot: 'bg-amber-400' },
              { label: 'Completed', count: met.length, dot: 'bg-green-500' },
            ].map(s => (
              <div key={s.label} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</div>
              </div>
            ))}
          </div>

          {overdue.length > 0 && (
            <DeadlineSection title={`Overdue (${overdue.length})`} titleClass="text-red-600 dark:text-red-400" icon={AlertTriangle} items={overdue} onMet={handleMarkMet} onDelete={setDeleteId} />
          )}
          {critical.length > 0 && (
            <DeadlineSection title={`Due Within 7 Days (${critical.length})`} titleClass="text-orange-600 dark:text-orange-400" icon={Bell} items={critical} onMet={handleMarkMet} onDelete={setDeleteId} />
          )}
          {upcoming.length > 0 && (
            <DeadlineSection title={`Upcoming (${upcoming.length})`} titleClass="text-gray-600 dark:text-gray-400" icon={Clock} items={upcoming} onMet={handleMarkMet} onDelete={setDeleteId} />
          )}
          {met.length > 0 && (
            <DeadlineSection title={`Completed (${met.length})`} titleClass="text-green-600 dark:text-green-400" icon={CheckCircle} items={met.slice(0, 10)} onMet={handleMarkMet} onDelete={setDeleteId} faded />
          )}
        </>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setFormError(''); }}
        title="Add Deadline"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button>
            <button type="button" onClick={() => void handleCreate()} className={cn(design.btn.primary, 'flex-1')}>Save Deadline</button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-base text-red-600 dark:text-red-400" role="alert">{formError}</p>}
          <div>
            <label htmlFor="deadline-title" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              id="deadline-title"
              type="text"
              placeholder="e.g. RFE Response — Smith Case"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className={design.input}
            />
          </div>
          <div>
            <label htmlFor="deadline-type" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select id="deadline-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={design.input}>
              {DEADLINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="deadline-date" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
            <input id="deadline-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={design.input} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Remove this deadline?"
        message="This deadline will be permanently removed from your list."
        confirmLabel="Remove"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

function DeadlineSection({
  title,
  titleClass,
  icon: Icon,
  items,
  onMet,
  onDelete,
  faded,
}: {
  title: string;
  titleClass: string;
  icon: typeof AlertTriangle;
  items: Deadline[];
  onMet: (id: string) => void;
  onDelete: (id: string) => void;
  faded?: boolean;
}) {
  return (
    <div className={cn(faded && 'opacity-70')}>
      <h2 className={cn('text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2', titleClass)}>
        <Icon className="w-4 h-4" aria-hidden="true" /> {title}
      </h2>
      <div className="space-y-2">
        {items.map(d => (
          <DeadlineRow key={d.id} deadline={d} onMet={onMet} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function DeadlineRow({
  deadline,
  onMet,
  onDelete,
}: {
  deadline: Deadline;
  onMet: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const urgency = getDaysUrgency(deadline.date);
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all', urgency.bg)}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', urgency.dot)} />
        <div className="min-w-0">
          <div className="font-medium text-gray-900 dark:text-white text-base">{deadline.title}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{deadline.type} · {format(new Date(deadline.date), 'MMMM d, yyyy')}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('text-sm font-semibold px-3 py-1.5 rounded-md bg-white/60 dark:bg-black/20', urgency.color)}>
          {deadline.status === 'Met' ? 'Completed' : urgency.label}
        </span>
        {deadline.status === 'Pending' && (
          <button type="button" onClick={() => onMet(deadline.id)} className="min-h-10 px-3 py-2 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors">
            Mark Complete
          </button>
        )}
        <button type="button" onClick={() => onDelete(deadline.id)} aria-label="Remove deadline" className={cn(design.btn.ghost, 'min-h-10 min-w-10')}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
