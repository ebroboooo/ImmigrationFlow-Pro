import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '../../../lib/utils';

interface KpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  trendUp?: boolean;
  formatValue?: (n: number) => string;
  onClick?: () => void;
  sparkline?: number[];
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-indigo-500',
  iconBg = 'bg-indigo-500/10',
  trend,
  trendUp,
  formatValue,
  onClick,
  sparkline,
}: KpiCardProps) {
  const formatted = formatValue ? formatValue(value) : undefined;
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'glass-card p-4 sm:p-5 flex flex-col gap-3 text-left transition-all duration-200',
        'hover:shadow-md hover:border-indigo-200/60 dark:hover:border-indigo-800/40',
        onClick && 'cursor-pointer active:scale-[0.99]',
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-snug">{title}</p>
        <div className={cn('p-2 rounded-xl shrink-0', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} aria-hidden="true" />
        </div>
      </div>

      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
        {formatted ?? <AnimatedCounter value={value} />}
      </div>

      {(trend || sparkline) && (
        <div className="flex items-end justify-between gap-2">
          {trend && (
            <span className={cn(
              'text-xs flex items-center gap-1',
              trendUp === true && 'text-emerald-600 dark:text-emerald-400',
              trendUp === false && 'text-rose-600 dark:text-rose-400',
              trendUp === undefined && 'text-gray-400',
            )}>
              {trendUp === true && <TrendingUp className="w-3 h-3" />}
              {trendUp === false && <TrendingDown className="w-3 h-3" />}
              {trend}
            </span>
          )}
          {sparkline && sparkline.length > 1 && (
            <svg viewBox="0 0 60 20" className="h-5 w-14 shrink-0" aria-hidden="true">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-indigo-400"
                points={sparkline.map((v, i) => {
                  const max = Math.max(...sparkline, 1);
                  const x = (i / (sparkline.length - 1)) * 60;
                  const y = 18 - (v / max) * 16;
                  return `${x},${y}`;
                }).join(' ')}
              />
            </svg>
          )}
        </div>
      )}
    </Wrapper>
  );
}
