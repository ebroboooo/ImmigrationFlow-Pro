import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { design } from '../../../lib/design';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-2' : 'p-8 bg-white/50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl',
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          'rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 dark:from-indigo-950/40 dark:to-cyan-950/20 flex items-center justify-center mb-3',
          compact ? 'w-12 h-12' : 'w-16 h-16 mb-4',
        )}
      >
        <Icon className={cn('text-indigo-400 dark:text-indigo-300', compact ? 'w-6 h-6' : 'w-8 h-8')} aria-hidden="true" />
      </div>
      <h3 className={cn('font-semibold text-gray-900 dark:text-white', compact ? 'text-sm' : 'text-lg mb-1')}>{title}</h3>
      {description && (
        <p className={cn('text-gray-500 dark:text-gray-400 max-w-sm', compact ? 'text-xs mt-1' : 'text-sm mb-5')}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={design.btn.primary}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
