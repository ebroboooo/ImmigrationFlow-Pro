import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Users, FileText, FolderOpen, Receipt, CheckSquare,
  CalendarClock, StickyNote, Settings, ArrowRight, Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRepositories } from '../../contexts/RepositoryContext';
import { useCommandPalette } from '../../contexts/CommandPaletteContext';
import {
  getRecentSearches,
  saveRecentSearch,
  searchApplication,
  type SearchCategory,
  type SearchResultItem,
} from '../../../lib/globalSearch';
import { cn } from '../../../lib/utils';

const CATEGORY_ICONS: Record<SearchCategory, typeof Users> = {
  Client: Users,
  Case: FileText,
  Document: FolderOpen,
  Invoice: Receipt,
  Task: CheckSquare,
  Deadline: CalendarClock,
  Note: StickyNote,
  Page: Settings,
};

export function CommandPalette() {
  const { open, closePalette } = useCommandPalette();
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery('');
      setRecent(getRecentSearches());
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const items = await searchApplication(repos, tenantId, q);
      setResults(items);
      setActiveIndex(0);
    } finally {
      setLoading(false);
    }
  }, [tenantId, repos]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void runSearch(query), 150);
    return () => clearTimeout(timer);
  }, [query, open, runSearch]);

  const selectItem = (item: SearchResultItem) => {
    if (query.trim()) saveRecentSearch(query.trim());
    closePalette();
    navigate(item.path);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      selectItem(results[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true" aria-label="Global search">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePalette} aria-label="Close search" />
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search clients, cases, documents, invoices…"
            aria-label="Search"
            className="flex-1 min-h-14 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">ESC</kbd>
          <button type="button" onClick={closePalette} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto py-2">
          {!query && recent.length > 0 && (
            <div className="px-3 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 mb-1">Recent</p>
              {recent.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  {term}
                </button>
              ))}
            </div>
          )}

          {loading && <p className="px-4 py-6 text-sm text-gray-400 text-center">Searching…</p>}

          {!loading && results.length === 0 && query && (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">No results for &ldquo;{query}&rdquo;</p>
          )}

          {!loading && results.map((item, index) => {
            const Icon = CATEGORY_ICONS[item.category];
            return (
              <button
                key={`${item.category}-${item.id}`}
                type="button"
                onClick={() => selectItem(item)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  index === activeIndex ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                )}
              >
                <span className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
                  <Icon className="w-4 h-4 text-indigo-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.label}</p>
                  <p className="text-xs text-gray-500 truncate">{item.category} · {item.sublabel}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-[10px] text-gray-400">
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">↵</kbd> open</span>
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Ctrl K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
