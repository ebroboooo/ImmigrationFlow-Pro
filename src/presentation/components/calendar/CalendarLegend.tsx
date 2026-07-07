import { Calendar, Clock, CheckSquare, Briefcase, Cloud } from 'lucide-react';
import { cn } from '../../../lib/utils';

const LEGEND_ITEMS = [
  { label: 'Appointments', color: 'bg-indigo-500', icon: Calendar },
  { label: 'Deadlines', color: 'bg-rose-500', icon: Clock },
  { label: 'Tasks', color: 'bg-cyan-500', icon: CheckSquare },
  { label: 'Case Dates', color: 'bg-violet-500', icon: Briefcase },
  { label: 'Google Calendar', color: 'bg-sky-500', icon: Cloud },
] as const;

export function CalendarLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2 sm:gap-3', className)} role="list" aria-label="Calendar legend">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} role="listitem" className="inline-flex items-center gap-2 min-h-10 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300">
          <span className={cn('w-3 h-3 rounded-full shrink-0', item.color)} aria-hidden="true" />
          <item.icon className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
          {item.label}
        </div>
      ))}
    </div>
  );
}
