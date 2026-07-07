import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { STORAGE_KEYS } from '../../lib/constants';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Clients',
  '/leads': 'Leads',
  '/cases': 'Cases',
  '/tasks': 'Tasks',
  '/documents': 'Documents',
  '/ai-intake': 'AI Intake',
  '/migration': 'Migration Wizard',
  '/calendar': 'Calendar',
  '/deadlines': 'Deadlines',
  '/billing': 'Billing',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === 'true';
  } catch {
    return false;
  }
}

function persistSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(collapsed));
  } catch {
    // storage unavailable
  }
}

interface NavigationContextValue {
  mobileOpen: boolean;
  sidebarCollapsed: boolean;
  pageTitle: string;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleSidebarCollapsed: () => void;
  /** @deprecated use sidebarCollapsed */
  tabletCollapsed: boolean;
  /** @deprecated use toggleSidebarCollapsed */
  toggleTabletNav: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  const pageTitle = useMemo(() => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    return ROUTE_TITLES[path] ?? 'ImmigrationFlow Pro';
  }, [location.pathname]);

  const closeMobileNav = useCallback(() => setMobileOpen(false), []);
  const openMobileNav = useCallback(() => setMobileOpen(true), []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      persistSidebarCollapsed(next);
      return next;
    });
  }, []);

  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, closeMobileNav]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileNav();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, closeMobileNav]);

  const value = useMemo(
    () => ({
      mobileOpen,
      sidebarCollapsed,
      pageTitle,
      openMobileNav,
      closeMobileNav,
      toggleSidebarCollapsed,
      tabletCollapsed: sidebarCollapsed,
      toggleTabletNav: toggleSidebarCollapsed,
    }),
    [mobileOpen, sidebarCollapsed, pageTitle, openMobileNav, closeMobileNav, toggleSidebarCollapsed],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
