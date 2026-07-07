import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRepositories } from '../contexts/RepositoryContext';
import { Bell, Trash2, CheckSquare, Filter } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { design } from '../../lib/design';
import type { Notification, NotificationType } from '../../domain/models/Sales';

type FilterTab = 'All' | NotificationType;

const FILTER_TABS: FilterTab[] = ['All', 'Task', 'Case', 'Document', 'Deadline', 'System', 'Lead'];

const TYPE_STYLES: Record<NotificationType, string> = {
  Task: 'border-l-blue-500',
  Case: 'border-l-purple-500',
  Document: 'border-l-cyan-500',
  Deadline: 'border-l-amber-500',
  System: 'border-l-gray-500',
  Lead: 'border-l-indigo-500',
};

export const Notifications = () => {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('All');

  useEffect(() => {
    const loadNotifications = async () => {
      if (!tenantId || !user) return;
      setLoading(true);
      try {
        const data = await repos.notifications.getByUser(tenantId, user.id);
        setNotifications(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      } finally {
        setLoading(false);
      }
    };
    void loadNotifications();
  }, [tenantId, user, repos.notifications]);

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => repos.notifications.update(n.id, { isRead: true })));
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = async (id: string) => {
    await repos.notifications.update(id, { isRead: true });
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const deleteNotification = async (id: string) => {
    await repos.notifications.delete(id);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  if (loading) return <PageSkeleton />;

  const filtered = filter === 'All' ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (notifications.length === 0) {
    return (
      <div className={design.page}>
        <PageHeader title="Notifications" description="Stay updated on cases, tasks, deadlines, and firm events." icon={Bell} />
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! We'll let you know when there's an update."
        />
      </div>
    );
  }

  return (
    <div className={cn(design.page, 'max-w-4xl mx-auto')}>
      <PageHeader
        title="Notifications"
        description="Stay updated on cases, tasks, deadlines, and firm events."
        icon={Bell}
        action={
          unreadCount > 0 ? (
            <button type="button" onClick={() => void markAllAsRead()} className={design.btn.secondary}>
              <CheckSquare className="w-4 h-4" />
              Mark all read
            </button>
          ) : undefined
        }
      />

      {unreadCount > 0 && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full">
          {unreadCount} unread
        </span>
      )}

      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-11 sm:min-h-0',
              filter === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications in this filter" description="Try another category." />
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => (
            <article
              key={notification.id}
              className={cn(
                'flex gap-4 p-4 rounded-xl border border-l-4 transition-all duration-150 hover:shadow-sm group',
                TYPE_STYLES[notification.type],
                notification.isRead
                  ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-80'
                  : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-4">
                  <h3 className={cn('text-sm font-semibold text-gray-900 dark:text-white', notification.isRead && 'font-normal text-gray-600 dark:text-gray-400')}>
                    {notification.title}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {format(notification.createdAt, 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className={cn('text-sm mt-1', notification.isRead ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300')}>
                  {notification.message}
                </p>
                <span className="inline-block mt-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">{notification.type}</span>
              </div>

              <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {!notification.isRead && (
                  <button
                    type="button"
                    onClick={() => void markAsRead(notification.id)}
                    className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-white dark:hover:bg-gray-800 min-h-11 min-w-11 flex items-center justify-center"
                    aria-label="Mark as read"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                )}
                {notification.link && (
                  <button
                    type="button"
                    onClick={() => navigate(notification.link!)}
                    className="text-xs text-indigo-600 px-2 py-1 hover:underline"
                  >
                    Open
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void deleteNotification(notification.id)}
                  className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-white dark:hover:bg-gray-800 min-h-11 min-w-11 flex items-center justify-center"
                  aria-label="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
