import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useCalendarSync } from '../contexts/CalendarSyncContext';
import type { Appointment, AppointmentType, Deadline, Task, Case } from '../../domain/models/Sales';
import type { ExternalCalendarEvent } from '../../domain/calendar/ExternalCalendarEvent';
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfDay, endOfDay, isWithinInterval, getHours, setHours,
} from 'date-fns';
import { cn } from '../../lib/utils';
import { design } from '../../lib/design';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { GoogleCalendarPanel } from '../components/calendar/GoogleCalendarPanel';
import { CalendarLegend } from '../components/calendar/CalendarLegend';

type ViewMode = 'day' | 'week' | 'month' | 'agenda';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'appointment' | 'deadline' | 'task' | 'case' | 'google';
  sublabel?: string;
  color: string;
  raw: Appointment | Deadline | Task | Case | ExternalCalendarEvent;
}

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

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

export const Calendar = () => {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const {
    externalEvents,
    connection,
    connectionStatus,
    syncSelected,
    syncing,
    refreshEvents,
  } = useCalendarSync();
  const autoSynced = useRef(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    title: '', type: 'Consultation' as AppointmentType, date: '', startTime: '09:00',
    endTime: '10:00', clientId: '', assignedUserId: '', location: '', notes: '',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [appts, dl, tsk, cs, clientData, userData] = await Promise.all([
          repos.appointments.getAll(tenantId),
          repos.deadlines.getAll(tenantId),
          repos.tasks.getAll(tenantId),
          repos.cases.getAll(tenantId),
          repos.clients.getAll(tenantId),
          repos.users.getAll(tenantId),
        ]);
        setAppointments(appts.filter((a) => a.status !== 'Cancelled'));
        setDeadlines(dl.filter((d) => d.status === 'Pending'));
        setTasks(tsk.filter((t) => t.status !== 'Completed' && t.dueDate));
        setCases(cs);
        setClients(clientData.map((c) => ({ id: c.id, name: c.name })));
        setUsers(userData.map((u) => ({ id: u.id, name: u.name })));
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    if (autoSynced.current || !connection?.autoSync || connectionStatus !== 'connected') return;
    if (!connection.selectedCalendarIds.length || syncing) return;
    autoSynced.current = true;
    void syncSelected(connection.selectedCalendarIds);
  }, [connection, connectionStatus, syncSelected, syncing]);

  const allEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    appointments.forEach((a) => {
      events.push({
        id: `appt-${a.id}`, title: a.title, start: new Date(a.startTime), end: new Date(a.endTime),
        type: 'appointment', sublabel: a.type, color: TYPE_COLORS[a.type], raw: a,
      });
    });
    deadlines.forEach((d) => {
      const day = new Date(d.date);
      events.push({
        id: `dl-${d.id}`, title: d.title, start: day, end: setHours(day, 23),
        type: 'deadline', sublabel: d.type, color: 'bg-rose-500', raw: d,
      });
    });
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const day = new Date(t.dueDate);
      events.push({
        id: `task-${t.id}`, title: t.title, start: day, end: setHours(day, 23),
        type: 'task', sublabel: t.type, color: 'bg-cyan-500', raw: t,
      });
    });
    cases.filter((c) => c.filingDeadline || c.filingDate).forEach((c) => {
      const day = new Date(c.filingDeadline ?? c.filingDate!);
      events.push({
        id: `case-${c.id}`, title: c.name, start: day, end: setHours(day, 23),
        type: 'case', sublabel: c.stage, color: 'bg-violet-500', raw: c,
      });
    });
    externalEvents.forEach((g) => {
      events.push({
        id: g.id,
        title: g.title,
        start: new Date(g.start),
        end: new Date(g.end),
        type: 'google',
        sublabel: g.calendarName,
        color: 'bg-sky-500',
        raw: g,
      });
    });
    return events;
  }, [appointments, deadlines, tasks, cases, externalEvents]);

  const range = useMemo(() => {
    if (viewMode === 'day') return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    if (viewMode === 'week') return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
    if (viewMode === 'month') return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    return { start: subDays(new Date(), 7), end: addDays(new Date(), 30) };
  }, [viewMode, currentDate]);

  const visibleEvents = useMemo(() =>
    allEvents.filter((e) => isWithinInterval(e.start, range))
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
  [allEvents, range]);

  const navigate = (dir: -1 | 1) => {
    if (viewMode === 'day') setCurrentDate(dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else if (viewMode === 'month') setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    const appt = await repos.appointments.create({
      tenantId, title: form.title, type: form.type, status: 'Scheduled',
      startTime: start, endTime: end, clientId: form.clientId || undefined,
      assignedUserId: form.assignedUserId || user?.id, location: form.location,
      notes: form.notes, createdAt: new Date(), updatedAt: new Date(),
    });
    setAppointments([...appointments, appt].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    setShowModal(false);
    setForm({ title: '', type: 'Consultation', date: '', startTime: '09:00', endTime: '10:00', clientId: '', assignedUserId: '', location: '', notes: '' });
  };

  const headerLabel = viewMode === 'day' ? format(currentDate, 'EEEE, MMMM d, yyyy')
    : viewMode === 'week' ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
    : viewMode === 'month' ? format(currentDate, 'MMMM yyyy')
    : 'Upcoming';

  const weekDays = eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });

  const eventsForDay = (day: Date) => visibleEvents.filter((e) => isSameDay(e.start, day));

  if (loading) return <PageSkeleton />;

  return (
    <div className={design.page}>
      <PageHeader
        title="Calendar"
        description={`${visibleEvents.length} events in this view`}
        icon={CalendarIcon}
        action={
          <button type="button" onClick={() => setShowModal(true)} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        }
      />

      <GoogleCalendarPanel />

      <CalendarLegend />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => navigate(-1)} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900" aria-label="Previous"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => setCurrentDate(new Date())} className={cn(design.btn.secondary, 'py-2')}>Today</button>
          <button type="button" onClick={() => navigate(1)} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900" aria-label="Next"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-1">{headerLabel}</span>
        </div>
        <div className="flex border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden w-full sm:w-auto">
          {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map((v) => (
            <button key={v} type="button" onClick={() => setViewMode(v)} className={cn('flex-1 sm:flex-none px-3 sm:px-4 py-2.5 text-sm capitalize min-h-11 transition-colors', viewMode === v ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="glass-card p-2 sm:p-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 min-w-[320px] mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 min-w-[320px]">
            {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) }).map((day) => {
              const dayEvents = allEvents.filter((e) => isSameDay(e.start, day));
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                  className={cn('min-h-[4.5rem] sm:min-h-24 p-1 sm:p-1.5 rounded-lg border text-left transition-colors hover:border-indigo-400',
                    isSameMonth(day, currentDate) ? 'border-gray-100 dark:border-gray-800' : 'border-transparent opacity-40',
                    isSameDay(day, new Date()) && 'ring-2 ring-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/20')}
                >
                  <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{format(day, 'd')}</div>
                  {dayEvents.slice(0, 3).map((e) => (
                    <div key={e.id} className={cn('truncate rounded px-1 py-0.5 text-white text-[9px] sm:text-[10px] mb-0.5', e.color)}>{e.title}</div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-[9px] text-gray-400">+{dayEvents.length - 3}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="glass-card overflow-x-auto">
          <div className={cn('grid min-w-[600px]', viewMode === 'week' ? 'grid-cols-8' : 'grid-cols-2')}>
            <div className="border-r border-gray-100 dark:border-gray-800" />
            {(viewMode === 'week' ? weekDays : [currentDate]).map((day) => (
              <div key={day.toISOString()} className={cn('text-center py-2 border-b border-gray-100 dark:border-gray-800 text-xs sm:text-sm font-semibold', isSameDay(day, new Date()) && 'text-indigo-600')}>
                {format(day, viewMode === 'week' ? 'EEE d' : 'EEEE, MMM d')}
              </div>
            ))}
            {HOURS.map((hour) => (
              <Fragment key={hour}>
                <div className="text-[10px] sm:text-xs text-gray-400 pr-2 text-right py-3 border-r border-gray-100 dark:border-gray-800">
                  {hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
                </div>
                {(viewMode === 'week' ? weekDays : [currentDate]).map((day) => {
                  const slotEvents = eventsForDay(day).filter((e) => getHours(e.start) === hour || (getHours(e.start) < hour && getHours(e.end) >= hour));
                  return (
                    <div key={`${day.toISOString()}-${hour}`} className="min-h-12 border-b border-r border-gray-50 dark:border-gray-800/50 p-0.5 relative">
                      {slotEvents.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSelectedEvent(e)}
                          className={cn('w-full text-left rounded px-1 py-0.5 text-[9px] sm:text-[10px] text-white truncate mb-0.5 hover:opacity-90', e.color)}
                        >
                          {format(e.start, 'h:mm')} {e.title}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'agenda' && (
        visibleEvents.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="Nothing scheduled" description="Add an appointment to get started." actionLabel="New Appointment" onAction={() => setShowModal(true)} />
        ) : (
          <div className="space-y-2">
            {visibleEvents.map((e) => (
              <button key={e.id} type="button" onClick={() => setSelectedEvent(e)} className="glass-card p-4 w-full text-left hover:shadow-md transition-shadow flex gap-3">
                <div className={cn('w-1 rounded-full shrink-0 self-stretch', e.color)} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white">{e.title}</div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(e.start, 'MMM d, h:mm a')}</span>
                    <span className="capitalize">{e.type}</span>
                    {e.sublabel && <span>{e.sublabel}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title ?? 'Event Details'}>
        {selectedEvent && (
          <dl className="space-y-3 text-sm">
            <div><dt className="text-gray-500">When</dt><dd className="font-medium">{format(selectedEvent.start, 'EEEE, MMMM d, yyyy · h:mm a')}</dd></div>
            <div><dt className="text-gray-500">Type</dt><dd className="font-medium capitalize">{selectedEvent.type}{selectedEvent.sublabel ? ` · ${selectedEvent.sublabel}` : ''}</dd></div>
            {selectedEvent.type === 'google' && (
              <>
                {(selectedEvent.raw as ExternalCalendarEvent).location && (
                  <div><dt className="text-gray-500">Location</dt><dd>{(selectedEvent.raw as ExternalCalendarEvent).location}</dd></div>
                )}
                {(selectedEvent.raw as ExternalCalendarEvent).description && (
                  <div><dt className="text-gray-500">Description</dt><dd className="whitespace-pre-wrap">{(selectedEvent.raw as ExternalCalendarEvent).description}</dd></div>
                )}
                {(selectedEvent.raw as ExternalCalendarEvent).organizer && (
                  <div><dt className="text-gray-500">Organizer</dt><dd>{(selectedEvent.raw as ExternalCalendarEvent).organizer}</dd></div>
                )}
                {(selectedEvent.raw as ExternalCalendarEvent).attendees?.length ? (
                  <div><dt className="text-gray-500">Attendees</dt><dd>{(selectedEvent.raw as ExternalCalendarEvent).attendees!.join(', ')}</dd></div>
                ) : null}
                <div><dt className="text-gray-500">Source</dt><dd>Google Calendar · {(selectedEvent.raw as ExternalCalendarEvent).calendarName}</dd></div>
              </>
            )}
            {selectedEvent.type === 'appointment' && (
              <>
                {(selectedEvent.raw as Appointment).location && <div><dt className="text-gray-500">Location</dt><dd>{(selectedEvent.raw as Appointment).location}</dd></div>}
                {(selectedEvent.raw as Appointment).clientId && <div><dt className="text-gray-500">Client</dt><dd>{clients.find((c) => c.id === (selectedEvent.raw as Appointment).clientId)?.name}</dd></div>}
                {(selectedEvent.raw as Appointment).assignedUserId && <div><dt className="text-gray-500">Staff</dt><dd>{users.find((u) => u.id === (selectedEvent.raw as Appointment).assignedUserId)?.name ?? 'Assigned'}</dd></div>}
              </>
            )}
          </dl>
        )}
      </Modal>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Appointment" size="lg"
        footer={<><button type="button" onClick={() => setShowModal(false)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button><button type="button" onClick={() => void handleCreate()} className={cn(design.btn.primary, 'flex-1')}>Save</button></>}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1.5">Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={design.input} placeholder="Client consultation" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AppointmentType })} className={design.input}>
                {APPOINTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">Date *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={design.input} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">Start</label><input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={design.input} /></div>
            <div><label className="block text-sm font-medium mb-1.5">End</label><input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={design.input} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1.5">Client</label>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={design.input}>
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1.5">Location</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={design.input} placeholder="Office or video call link" /></div>
        </div>
      </Modal>
    </div>
  );
};
