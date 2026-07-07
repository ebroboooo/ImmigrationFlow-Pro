import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface NavTooltipProps {
  label: string;
  show: boolean;
  children: ReactNode;
  className?: string;
}

export function NavTooltip({ label, show, children, className }: NavTooltipProps) {
  if (!show) return <>{children}</>;

  return (
    <div className={cn('relative group/navtip', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/navtip:opacity-100 group-focus-within/navtip:opacity-100 dark:bg-gray-100 dark:text-gray-900"
      >
        {label}
      </span>
    </div>
  );
}
