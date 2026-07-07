import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ExternalLink, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useRepositories } from '../../contexts/RepositoryContext';
import type { Notification, NotificationType } from '../../../domain/models/Sales';
import { cn } from '../../../lib/utils';
import { EmptyState } from '../ui/EmptyState';

type FilterTab = 'All' | NotificationType;

const FILTER_TABS: FilterTab[] = ['All', 'Task', 'Case', 'Document', 'Deadline', 'System', 'Lead'];

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterTab>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !tenantId || !user) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await repos.notifications.getByUser(tenantId, user.id);
        setNotifications(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, tenantId, user, repos.notifications]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => repos.notifications.update(n.id, { isRead: true })));
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const markRead = async (id: string) => {
    await repos.notifications.update(id, { isRead: true });
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  if (!open) return null;

  const filtered = filter === 'All' ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2 w-[min(100vw-1.5rem,24rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button type="button" onClick={() => void markAllRead()} className="text-xs text-indigo-600 dark:text-indigo-400 px-2 py-1 hover:underline">
              Mark all read
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-3 py-2 overflow-x-auto hide-scrollbar border-b border-gray-50 dark:border-gray-800/50">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              'shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              filter === tab
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading && <p className="p-6 text-sm text-gray-400 text-center">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <EmptyState icon={Bell} title="All caught up" description="No notifications in this filter." compact />
        )}
        {!loading && filtered.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => {
              void markRead(n.id);
              if (n.link) navigate(n.link);
              else navigate('/notifications');
              onClose();
            }}
            className={cn(
              'w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
              !n.isRead && 'bg-indigo-50/50 dark:bg-indigo-950/20',
            )}
          >
            <div className="flex justify-between gap-2">
              <p className={cn('text-sm font-medium text-gray-900 dark:text-white', n.isRead && 'font-normal text-gray-600 dark:text-gray-400')}>
                {n.title}
              </p>
              {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
            <p className="text-[10px] text-gray-400 mt-1">{format(n.createdAt, 'MMM d, h:mm a')}</p>
          </button>
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={() => { navigate('/notifications'); onClose(); }}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 py-2 hover:underline"
        >
          View all notifications <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function NotificationBellButton({
  unreadCount,
  onClick,
}: {
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 dark:text-gray-400 transition-colors relative focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-950">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
