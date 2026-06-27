import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserSquare2, Kanban, CheckSquare, Settings, LogOut,
  BarChart3, Scale, FileText, CalendarClock, Receipt, Calendar,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessRoute } from '../../../lib/permissions';

export const Sidebar = () => {
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Leads', path: '/leads', icon: UserSquare2 },
    { name: 'Cases', path: '/cases', icon: Kanban },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Deadlines', path: '/deadlines', icon: CalendarClock },
    { name: 'Billing', path: '/billing', icon: Receipt },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ].filter(item => canAccessRoute(user?.role, item.path));

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl hidden md:flex flex-col h-full z-20 relative">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Scale className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight truncate max-w-[170px]">ImmigrationFlow</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Main Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
              isActive
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-200"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                )} />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {canAccessRoute(user?.role, '/settings') && (
          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-200"
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
        )}
        <button
          onClick={() => {
            logout();
            window.location.href = '/welcome';
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors mt-1"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
};
