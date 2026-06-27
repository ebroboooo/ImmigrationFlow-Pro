import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import type { Deadline } from '../../domain/models/Sales';
import { CalendarClock, AlertTriangle, Plus, X, CheckCircle, Clock, Bell } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '../../lib/utils';

const DEADLINE_TYPES = ['USCIS Deadline','RFE Deadline','Court Deadline','Interview Date','Biometric Appointment','Expiration Date','Filing Deadline'];

function getDaysUrgency(date: Date) {
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', dot: 'bg-red-500' };
  if (days <= 7) return { label: `${days}d`, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', dot: 'bg-red-500' };
  if (days <= 14) return { label: `${days}d`, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' };
  if (days <= 30) return { label: `${days}d`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', dot: 'bg-amber-400' };
  return { label: `${days}d`, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800', dot: 'bg-gray-400' };
}

export const Deadlines = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'USCIS Deadline', date: '' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await repos.deadlines.getAll(tenantId);
        setDeadlines(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (tenantId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    const newDeadline = await repos.deadlines.create({
      tenantId, title: form.title, type: form.type as Deadline['type'], date: new Date(form.date),
      status: 'Pending', createdAt: new Date()
    });
    setDeadlines([...deadlines, newDeadline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setShowModal(false);
    setForm({ title: '', type: 'USCIS Deadline', date: '' });
  };

  const handleMarkMet = async (id: string) => {
    await repos.deadlines.update(id, { status: 'Met' });
    setDeadlines(deadlines.map(d => d.id === id ? { ...d, status: 'Met' } : d));
  };

  const overdue = deadlines.filter(d => d.status === 'Pending' && differenceInDays(new Date(d.date), new Date()) < 0);
  const critical = deadlines.filter(d => d.status === 'Pending' && differenceInDays(new Date(d.date), new Date()) >= 0 && differenceInDays(new Date(d.date), new Date()) <= 7);
  const upcoming = deadlines.filter(d => d.status === 'Pending' && differenceInDays(new Date(d.date), new Date()) > 7);
  const met = deadlines.filter(d => d.status === 'Met');

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading deadlines...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-indigo-500" /> Deadline Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{overdue.length} overdue · {critical.length} critical (7 days) · {upcoming.length} upcoming</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Deadline
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Overdue', count: overdue.length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', dot: 'bg-red-500' },
          { label: 'Critical (7d)', count: critical.length, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', dot: 'bg-orange-500' },
          { label: 'Upcoming', count: upcoming.length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-400' },
          { label: 'Met', count: met.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', dot: 'bg-green-500' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("w-2 h-2 rounded-full", s.dot)}></span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</div>
          </div>
        ))}
      </div>

      {/* Overdue section */}
      {overdue.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Overdue ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map(d => <DeadlineRow key={d.id} deadline={d} onMet={handleMarkMet} />)}
          </div>
        </div>
      )}

      {/* Critical section */}
      {critical.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Critical — Within 7 Days ({critical.length})
          </h2>
          <div className="space-y-2">
            {critical.map(d => <DeadlineRow key={d.id} deadline={d} onMet={handleMarkMet} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Upcoming ({upcoming.length})
          </h2>
          <div className="space-y-2">
            {upcoming.map(d => <DeadlineRow key={d.id} deadline={d} onMet={handleMarkMet} />)}
          </div>
        </div>
      )}

      {/* Met */}
      {met.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Met ({met.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {met.slice(0, 5).map(d => <DeadlineRow key={d.id} deadline={d} onMet={handleMarkMet} />)}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Deadline</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" placeholder="e.g. RFE Response - Smith Case" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {DEADLINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Add Deadline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DeadlineRow = ({ deadline, onMet }: { deadline: Deadline; onMet: (id: string) => void }) => {
  const urgency = getDaysUrgency(deadline.date);
  return (
    <div className={cn("flex items-center justify-between p-4 rounded-xl border transition-all", urgency.bg)}>
      <div className="flex items-center gap-3">
        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", urgency.dot)}></span>
        <div>
          <div className="font-medium text-gray-900 dark:text-white text-sm">{deadline.title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{deadline.type} · {format(new Date(deadline.date), 'MMM d, yyyy')}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-bold px-2 py-1 rounded-md bg-white/60 dark:bg-black/20", urgency.color)}>
          {deadline.status === 'Met' ? '✓ Met' : urgency.label}
        </span>
        {deadline.status === 'Pending' && (
          <button onClick={() => onMet(deadline.id)} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md hover:bg-green-200 transition-colors">
            Mark Met
          </button>
        )}
      </div>
    </div>
  );
};
