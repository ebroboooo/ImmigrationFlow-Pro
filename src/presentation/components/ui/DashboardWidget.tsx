import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { cn } from '../../../lib/utils';

interface DashboardWidgetProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onViewAll?: () => void;
  className?: string;
}

export function DashboardWidget({
  title,
  icon: Icon,
  children,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onViewAll,
  className,
}: DashboardWidgetProps) {
  const hasContent = React.Children.toArray(children).length > 0;

  return (
    <section className={cn('glass-card p-5 flex flex-col h-full transition-shadow duration-200 hover:shadow-md', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-500/10">
            <Icon className="w-4 h-4 text-indigo-500" aria-hidden="true" />
          </span>
          {title}
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline min-h-11 px-2 -mr-2"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {!hasContent ? (
        <EmptyState
          icon={Icon}
          title={emptyTitle}
          description={emptyDescription ?? ''}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
          compact
        />
      ) : (
        <div className="flex-1 space-y-1">{children}</div>
      )}
    </section>
  );
}

export function WidgetRow({
  title,
  subtitle,
  trailing,
  onClick,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg border-b border-gray-100 dark:border-gray-800/80 last:border-0 text-left w-full',
        onClick && 'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subtitle}</p>}
      </div>
      {trailing}
    </Wrapper>
  );
}
