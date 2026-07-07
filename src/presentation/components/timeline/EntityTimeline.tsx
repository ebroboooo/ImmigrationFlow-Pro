import {
  UserPlus, MessageCircle, FileUp, Receipt, CreditCard, Briefcase,
  Calendar, Clock, StickyNote, Activity, CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { TimelineEvent, TimelineEventType } from '../../../lib/entityTimeline';
import { cn } from '../../../lib/utils';

const EVENT_CONFIG: Record<TimelineEventType, { icon: typeof UserPlus; color: string; bg: string }> = {
  created: { icon: UserPlus, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  consultation: { icon: MessageCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  document: { icon: FileUp, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  invoice: { icon: Receipt, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  payment: { icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  case: { icon: Briefcase, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  deadline: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  appointment: { icon: Calendar, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/40' },
  task: { icon: CheckCircle2, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40' },
  note: { icon: StickyNote, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  activity: { icon: Activity, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  status: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
};

interface EntityTimelineProps {
  events: TimelineEvent[];
  className?: string;
  maxItems?: number;
}

export function EntityTimeline({ events, className, maxItems }: EntityTimelineProps) {
  const items = maxItems ? events.slice(0, maxItems) : events;

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8" role="status">
        No timeline events yet.
      </p>
    );
  }

  return (
    <ol className={cn('relative space-y-0', className)} aria-label="Timeline">
      {items.map((event, index) => {
        const cfg = EVENT_CONFIG[event.type];
        const Icon = cfg.icon;
        const isLast = index === items.length - 1;

        return (
          <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span className="absolute left-[19px] top-10 bottom-0 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
            )}
            <div className={cn('relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
              <Icon className={cn('w-4 h-4', cfg.color)} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="glass-card p-3 sm:p-4 hover:shadow-sm transition-shadow duration-200">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{event.title}</p>
                  <time className="text-[10px] text-gray-400 whitespace-nowrap" dateTime={event.date.toISOString()}>
                    {format(event.date, 'MMM d, yyyy')}
                  </time>
                </div>
                {event.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{event.description}</p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
