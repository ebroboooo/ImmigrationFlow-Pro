import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRepositories } from '../../contexts/RepositoryContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useCommandPalette } from '../../contexts/CommandPaletteContext';
import { Search, Sun, Moon, Menu } from 'lucide-react';
import { NotificationCenter, NotificationBellButton } from '../notifications/NotificationCenter';

export const Header = () => {
  const { user, tenantId } = useAuth();
  const { theme, setTheme } = useTheme();
  const repos = useRepositories();
  const navigate = useNavigate();
  const { pageTitle, openMobileNav } = useNavigation();
  const { openPalette } = useCommandPalette();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!tenantId || !user) return;
      const notifs = await repos.notifications.getByUser(tenantId, user.id);
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
    };
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 15000);
    return () => clearInterval(interval);
  }, [tenantId, user, repos]);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/85 dark:bg-gray-950/85 backdrop-blur-md safe-top">
      <div className="flex min-h-14 sm:min-h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={openMobileNav}
          aria-label="Open navigation menu"
          className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate md:hidden">
            {pageTitle}
          </h1>
          <button
            type="button"
            onClick={openPalette}
            className="hidden md:flex items-center gap-3 flex-1 max-w-md min-h-11 px-4 rounded-xl bg-gray-100/80 dark:bg-gray-900/80 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-sm text-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            aria-label="Open search (Ctrl+K)"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">Search clients, cases, documents…</span>
            <kbd className="hidden lg:inline text-[10px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded">Ctrl K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Open search"
            className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative">
            <NotificationBellButton unreadCount={unreadCount} onClick={() => setNotifOpen((o) => !o)} />
            <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="inline-flex sm:hidden min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            aria-label="Open profile and settings"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white dark:ring-gray-950">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="hidden sm:flex items-center gap-2 pl-1 pr-2 min-h-11 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            aria-label="Open profile and settings"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white dark:ring-gray-950 shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-white leading-none truncate max-w-[8rem]">{user?.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">{user?.role}</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
