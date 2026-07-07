import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserSquare2, Kanban, CheckSquare, Settings, LogOut,
  BarChart3, Scale, FileText, CalendarClock, Receipt, Calendar, ChevronLeft, ChevronRight, Sparkles, Database,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessRoute } from '../../../lib/permissions';
import { useNavigation } from '../../contexts/NavigationContext';
import { NavTooltip } from '../ui/NavTooltip';

interface SidebarProps {
  variant?: 'desktop' | 'tablet' | 'mobile';
  onNavigate?: () => void;
}

export function Sidebar({ variant = 'desktop', onNavigate }: SidebarProps) {
  const { logout, user } = useAuth();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useNavigation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Leads', path: '/leads', icon: UserSquare2 },
    { name: 'Cases', path: '/cases', icon: Kanban },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'AI Intake', path: '/ai-intake', icon: Sparkles },
    { name: 'Migration Wizard', path: '/migration', icon: Database },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Deadlines', path: '/deadlines', icon: CalendarClock },
    { name: 'Billing', path: '/billing', icon: Receipt },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ].filter(item => canAccessRoute(user?.role, item.path));

  const collapsible = variant === 'desktop' || variant === 'tablet';
  const collapsed = collapsible && sidebarCollapsed;
  const widthClass =
    variant === 'mobile'
      ? 'w-72 max-w-[85vw]'
      : collapsed
        ? 'w-[4.5rem]'
        : 'w-64';

  const navLinkClass = (isActive: boolean) => cn(
    'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group min-h-11 w-full',
    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
    isActive
      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200/60 dark:ring-indigo-500/20'
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-200',
  );

  return (
    <aside
      className={cn(
        widthClass,
        'border-r border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl flex flex-col h-full shrink-0 transition-[width] duration-300 ease-in-out',
        variant === 'desktop' && 'hidden lg:flex',
        variant === 'tablet' && 'hidden md:flex lg:hidden',
        variant === 'mobile' && 'flex shadow-2xl',
      )}
      aria-label="Main navigation"
    >
      <div className={cn(
        'h-16 flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0',
        collapsed ? 'justify-center px-2' : 'px-4 sm:px-6',
      )}>
        <div className={cn('flex items-center gap-2 min-w-0 flex-1', collapsed && 'justify-center flex-none')}>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0" aria-hidden>
            <Scale className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-white tracking-tight truncate">
              ImmigrationFlow
            </span>
          )}
        </div>
        {collapsible && !collapsed && (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label="Collapse sidebar"
            aria-expanded={!collapsed}
            className="ml-auto p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-11 min-w-11 inline-flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsible && collapsed && (
        <div className="px-2 pt-2 shrink-0">
          <NavTooltip label="Expand sidebar" show>
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label="Expand sidebar"
              aria-expanded={false}
              className="flex w-full items-center justify-center rounded-xl min-h-11 py-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </NavTooltip>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 sm:px-3 space-y-1" aria-label="Primary">
        {!collapsed && (
          <div className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Main Menu
          </div>
        )}
        {navItems.map((item) => (
          <NavTooltip key={item.name} label={item.name} show={collapsed}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              aria-label={collapsed ? item.name : undefined}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300',
                  )} aria-hidden />
                  {!collapsed && <span>{item.name}</span>}
                </>
              )}
            </NavLink>
          </NavTooltip>
        ))}
      </nav>

      <div className={cn('p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 space-y-1 shrink-0', collapsed && 'px-2')}>
        {canAccessRoute(user?.role, '/settings') && (
          <NavTooltip label="Settings" show={collapsed}>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              aria-label={collapsed ? 'Settings' : undefined}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Settings className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && <span>Settings</span>}
            </NavLink>
          </NavTooltip>
        )}
        <NavTooltip label="Log Out" show={collapsed}>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = '/welcome';
            }}
            aria-label={collapsed ? 'Log Out' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors min-h-11',
              collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            {!collapsed && <span>Log Out</span>}
          </button>
        </NavTooltip>
      </div>
    </aside>
  );
}
