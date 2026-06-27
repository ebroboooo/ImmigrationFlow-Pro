import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRepositories } from '../contexts/RepositoryContext';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, Info, Trash2, CheckSquare } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import type { Notification } from '../../domain/models/Sales';

export const Notifications = () => {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!tenantId || !user) return;
      setLoading(true);
      try {
        const data = await repos.notifications.getByUser(tenantId, user.id);
        setNotifications(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadNotifications();
  }, [tenantId, user, repos.notifications]);

  const markAllAsRead = async () => {
    try {
      const unisRead = notifications.filter(n => !n.isRead);
      await Promise.all(unisRead.map(n => repos.notifications.update(n.id, { isRead: true })));
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (e) { console.error(e); }
  };

  const markAsRead = async (id: string) => {
    try {
      await repos.notifications.update(id, { isRead: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  const deleteNotification = async (id: string) => {
    try {
      await repos.notifications.delete(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800';
    switch (type) {
      case 'success': return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
      case 'warning': return 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
      case 'error': return 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20';
      default: return 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20';
    }
  };

  if (loading) return <div className="p-8">Loading notifications...</div>;

  if (notifications.length === 0) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <EmptyState 
          icon={Bell}
          title="No notifications"
          description="You're all caught up! We'll let you know when there's an update."
        />
      </div>
    );
  }

  const unisReadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            Notifications
            {unisReadCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs px-2.5 py-0.5 rounded-full">{unisReadCount} new</span>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Stay updated on cases, tasks, deadlines, and firm events.</p>
        </div>
        {unisReadCount > 0 && (
          <button onClick={markAllAsRead} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
            <CheckSquare className="w-4 h-4" />
            Mark All as Read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={cn(
              "flex gap-4 p-4 rounded-xl border transition-colors group",
              getBgColor(notification.type, notification.isRead)
            )}
          >
            <div className="mt-1 shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-4">
                <h3 className={cn("text-sm font-semibold text-gray-900 dark:text-white", notification.isRead && "text-gray-600 dark:text-gray-300")}>
                  {notification.title}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {format(notification.createdAt, 'MMM d, h:mm a')}
                </span>
              </div>
              <p className={cn("text-sm mt-1", notification.isRead ? "text-gray-500 dark:text-gray-400" : "text-gray-700 dark:text-gray-300")}>
                {notification.message}
              </p>
            </div>
            
            <div className="flex items-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.isRead && (
                <button onClick={() => markAsRead(notification.id)} className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-white dark:hover:bg-gray-800" title="Mark as isRead">
                  <CheckSquare className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => deleteNotification(notification.id)} className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-white dark:hover:bg-gray-800" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
