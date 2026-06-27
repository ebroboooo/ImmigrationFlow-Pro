import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRepositories } from '../../contexts/RepositoryContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Bell, Search, Sun, Moon, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface SearchResult {
  id: string;
  type: 'Client' | 'Case';
  label: string;
  sublabel: string;
  path: string;
}

export const Header = () => {
  const { user, tenantId } = useAuth();
  const { theme, setTheme } = useTheme();
  const repos = useRepositories();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!tenantId || !user) return;
      const notifs = await repos.notifications.getByUser(tenantId, user.id);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [tenantId, user, repos]);

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim() || !tenantId) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const [clients, cases] = await Promise.all([
      repos.clients.getAll(tenantId),
      repos.cases.getAll(tenantId),
    ]);
    const results: SearchResult[] = [
      ...clients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.aNumber?.toLowerCase().includes(q)
      ).slice(0, 5).map(c => ({
        id: c.id, type: 'Client' as const, label: c.name,
        sublabel: c.immigrationStatus || 'Client', path: '/clients',
      })),
      ...cases.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.uscisReceiptNumber?.toLowerCase().includes(q)
      ).slice(0, 5).map(c => ({
        id: c.id, type: 'Case' as const, label: c.name,
        sublabel: c.stage, path: '/cases',
      })),
    ];
    setSearchResults(results);
  }, [tenantId, repos]);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery, runSearch]);

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-950/70 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients, cases, receipt numbers..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className={cn(
              "w-full h-10 pl-10 pr-10 rounded-full text-sm",
              "bg-gray-100 dark:bg-gray-900 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-950 focus:ring-1 focus:ring-indigo-500",
              "transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
            )}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
              {searchResults.map(r => (
                <button key={`${r.type}-${r.id}`} onMouseDown={() => navigate(r.path)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{r.label}</div>
                  <div className="text-xs text-gray-500">{r.type} · {r.sublabel}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 dark:text-gray-400 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-gray-950" />
          )}
        </button>

        <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 mx-2" />

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 dark:text-white leading-none">{user?.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">{user?.role}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};
