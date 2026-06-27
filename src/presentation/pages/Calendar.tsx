import { useState, useEffect, useMemo } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import type { Appointment, AppointmentType } from '../../domain/models/Sales';
import {
  Calendar as CalendarIcon, Plus, X, ChevronLeft, ChevronRight, Clock, MapPin, User,
} from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfDay, endOfDay, isWithinInterval,
} from 'date-fns';
import { cn } from '../../lib/utils';

type ViewMode = 'day' | 'week' | 'month' | 'agenda';

const APPOINTMENT_TYPES: AppointmentType[] = [
  'Consultation', 'Follow-up', 'Interview Prep', 'Court Hearing',
  'Biometrics', 'USCIS Interview', 'Internal Meeting',
];

const TYPE_COLORS: Record<AppointmentType, string> = {
  'Consultation': 'bg-indigo-500',
  'Follow-up': 'bg-blue-500',
  'Interview Prep': 'bg-purple-500',
  'Court Hearing': 'bg-red-500',
  'Biometrics': 'bg-amber-500',
  'USCIS Interview': 'bg-emerald-500',
  'Internal Meeting': 'bg-gray-500',
};

export const Calendar = () => {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'Consultation' as AppointmentType, date: '', startTime: '09:00',
    endTime: '10:00', clientId: '', assignedUserId: '', location: '', notes: '',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [appts, clientData, userData] = await Promise.all([
          repos.appointments.getAll(tenantId),
          repos.clients.getAll(tenantId),
          repos.users.getAll(tenantId),
        ]);
        setAppointments(appts.filter(a => a.status !== 'Cancelled'));
        setClients(clientData.map(c => ({ id: c.id, name: c.name })));
        setUsers(userData.map(u => ({ id: u.id, name: u.name })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (tenantId) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const range = useMemo(() => {
    if (viewMode === 'day') return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    if (viewMode === 'week') return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
    if (viewMode === 'month') return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    return { start: subDays(new Date(), 7), end: addDays(new Date(), 30) };
  }, [viewMode, currentDate]);

  const visibleAppointments = useMemo(() =>
    appointments.filter(a => isWithinInterval(new Date(a.startTime), range))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  [appointments, range]);

  const navigate = (dir: -1 | 1) => {
    if (viewMode === 'day') setCurrentDate(dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else if (viewMode === 'month') setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    const conflict = appointments.some(a =>
      a.assignedUserId === (form.assignedUserId || user?.id) &&
      a.status !== 'Cancelled' &&
      start < new Date(a.endTime) && end > new Date(a.startTime)
    );
    if (conflict && !window.confirm('Schedule conflict detected. Create anyway?')) return;

    const appt = await repos.appointments.create({
      tenantId, title: form.title, type: form.type, status: 'Scheduled',
      startTime: start, endTime: end, clientId: form.clientId || undefined,
      assignedUserId: form.assignedUserId || user?.id, location: form.location,
      notes: form.notes, createdAt: new Date(), updatedAt: new Date(),
    });
    setAppointments([...appointments, appt].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    setShowModal(false);
    setForm({ title: '', type: 'Consultation', date: '', startTime: '09:00', endTime: '10:00', clientId: '', assignedUserId: '', location: '', notes: '' });
  };

  const handleCancel = async (id: string) => {
    await repos.appointments.update(id, { status: 'Cancelled', updatedAt: new Date() });
    setAppointments(appointments.filter(a => a.id !== id));
  };

  const headerLabel = viewMode === 'day' ? format(currentDate, 'EEEE, MMMM d, yyyy')
    : viewMode === 'week' ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy');

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading calendar...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-500" /> Calendar
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{visibleAppointments.length} appointments in view</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Appointment
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">Today</button>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">{headerLabel}</span>
        </div>
        <div className="flex border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          {(['day', 'week', 'month', 'agenda'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setViewMode(v)} className={cn("px-3 py-2 text-sm capitalize transition-colors",
              viewMode === v ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400")}>{v}</button>
          ))}
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="glass-card p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) }).map(day => {
              const dayAppts = appointments.filter(a => isSameDay(new Date(a.startTime), day));
              return (
                <div key={day.toISOString()} className={cn("min-h-24 p-1.5 rounded-lg border text-xs",
                  isSameMonth(day, currentDate) ? "border-gray-100 dark:border-gray-800" : "border-transparent opacity-40",
                  isSameDay(day, new Date()) && "ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/10")}>
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">{format(day, 'd')}</div>
                  {dayAppts.slice(0, 2).map(a => (
                    <div key={a.id} className={cn("truncate rounded px-1 py-0.5 text-white text-[10px] mb-0.5", TYPE_COLORS[a.type])}>{a.title}</div>
                  ))}
                  {dayAppts.length > 2 && <div className="text-gray-400">+{dayAppts.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(viewMode === 'day' || viewMode === 'week' || viewMode === 'agenda') && (
        <div className="space-y-2">
          {visibleAppointments.length === 0 ? (
            <div className="glass-card p-10 text-center text-gray-500 dark:text-gray-400">No appointments scheduled.</div>
          ) : visibleAppointments.map(appt => (
            <AppointmentCard key={appt.id} appt={appt} clients={clients} users={users} onCancel={handleCancel} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Schedule Appointment</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AppointmentType })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                    {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start</label>
                  <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End</label>
                  <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned To</label>
                <select value={form.assignedUserId} onChange={e => setForm({ ...form, assignedUserId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                  <option value="">Me ({user?.name})</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input type="text" placeholder="Office / Video call" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AppointmentCard = ({ appt, clients, users, onCancel }: {
  appt: Appointment;
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
  onCancel: (id: string) => void;
}) => (
  <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex items-start gap-3">
      <div className={cn("w-1 self-stretch rounded-full shrink-0", TYPE_COLORS[appt.type])} />
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{appt.title}</div>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(appt.startTime), 'MMM d, h:mm a')} – {format(new Date(appt.endTime), 'h:mm a')}</span>
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{users.find(u => u.id === appt.assignedUserId)?.name || 'Unassigned'}</span>
          {appt.clientId && <span>{clients.find(c => c.id === appt.clientId)?.name}</span>}
          {appt.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{appt.location}</span>}
        </div>
        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">{appt.type}</span>
      </div>
    </div>
    <button onClick={() => onCancel(appt.id)} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0">Cancel</button>
  </div>
);
