import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRepositories } from '../contexts/RepositoryContext';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { design } from '../../lib/design';
import { loadWorkspaceData } from '../../application/workspace/workspaceDataService';
import { calculateFirmHealth } from '../../application/workspace/firmHealthService';
import { generateDailyBriefing } from '../../application/workspace/dailyBriefingService';
import { roleWorkspaceService } from '../../application/workspace/roleWorkspaceService';
import { generateRoleNotifications } from '../../infrastructure/workspace/workspaceNotificationEngine';
import type { DailyBriefing, FirmHealthResult, WorkspaceData, WidgetId } from '../../domain/workspace/WorkspaceTypes';
import { WORKSPACE_ROLE_LABELS } from '../../domain/workspace/WorkspaceTypes';
import { cn } from '../../lib/utils';

const LazyWidgets = lazy(() => import('../components/workspace/WorkspaceWidgetGrid'));

export function RoleWorkspaceDashboard() {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [health, setHealth] = useState<FirmHealthResult | null>(null);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);

  const workspaceRole = user ? roleWorkspaceService.resolveRole(user.role) : 'legal_assistant';
  const layout = user ? roleWorkspaceService.getLayout(user.role) : null;
  const widgets = useMemo(() => {
    if (!layout || !user) return [];
    return roleWorkspaceService.filterWidgets(layout.widgets, user.role);
  }, [layout, user]);

  const quickActions = useMemo(() => {
    if (!layout || !user) return [];
    return roleWorkspaceService.filterActions(layout.quickActions, user.role);
  }, [layout, user]);

  const notifications = useMemo(() => {
    if (!data || !user) return [];
    return roleWorkspaceService.filterNotifications(
      generateRoleNotifications(data, workspaceRole),
      user.role,
    );
  }, [data, workspaceRole, user]);

  useEffect(() => {
    if (!tenantId || !user) return;
    const load = async () => {
      setLoading(true);
      try {
        const wsData = await loadWorkspaceData({ repos, tenantId, userId: user.id });
        setData(wsData);
        setHealth(calculateFirmHealth(wsData));
        setBriefing(generateDailyBriefing(wsData, workspaceRole, user.name));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [tenantId, user, repos, workspaceRole]);

  if (loading || !data || !user) return <DashboardSkeleton />;

  return (
    <div className={design.page}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {briefing?.greeting}
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1.5">
            {WORKSPACE_ROLE_LABELS[workspaceRole]} · {briefing?.dateLabel}
          </p>
        </div>
        {health && (widgets.includes('firm_health' as WidgetId)) && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border min-h-12',
            health.overallScore >= 75
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : health.overallScore >= 50
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
          )}>
            Firm Health: {health.overallScore}/100 · {health.grade}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.slice(0, 3).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => n.path && navigate(n.path)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border text-base min-h-12 transition-colors',
                n.priority === 'critical' && 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800',
                n.priority === 'high' && 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800',
                n.priority === 'medium' && 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-800',
                n.priority === 'low' && 'bg-gray-50 dark:bg-gray-900 border-gray-200 text-gray-700',
              )}
            >
              <strong>{n.title}:</strong> {n.message}
            </button>
          ))}
        </div>
      )}

      <Suspense fallback={<DashboardSkeleton />}>
        <LazyWidgets
          widgets={widgets}
          data={data}
          health={health}
          briefing={briefing}
          quickActions={quickActions}
        />
      </Suspense>
    </div>
  );
}
