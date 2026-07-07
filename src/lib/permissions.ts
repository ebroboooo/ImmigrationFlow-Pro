import type { UserRole } from '../domain/models/User';

export type Permission =
  | 'dashboard:view'
  | 'clients:view'
  | 'clients:edit'
  | 'leads:view'
  | 'leads:edit'
  | 'cases:view'
  | 'cases:edit'
  | 'tasks:view'
  | 'tasks:edit'
  | 'documents:view'
  | 'documents:edit'
  | 'deadlines:view'
  | 'deadlines:edit'
  | 'calendar:view'
  | 'calendar:edit'
  | 'billing:view'
  | 'billing:edit'
  | 'reports:view'
  | 'settings:view'
  | 'settings:edit'
  | 'users:manage'
  | 'ai-intake:view'
  | 'ai-intake:edit'
  | 'migration:view'
  | 'migration:edit';

const ALL_PERMISSIONS: Permission[] = [
  'dashboard:view', 'clients:view', 'clients:edit', 'leads:view', 'leads:edit',
  'cases:view', 'cases:edit', 'tasks:view', 'tasks:edit', 'documents:view',
  'documents:edit', 'deadlines:view', 'deadlines:edit', 'calendar:view',
  'calendar:edit', 'billing:view', 'billing:edit', 'reports:view',
  'settings:view', 'settings:edit', 'users:manage', 'ai-intake:view', 'ai-intake:edit',
  'migration:view', 'migration:edit',
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ALL_PERMISSIONS,
  manager: ALL_PERMISSIONS.filter(p => p !== 'users:manage' && p !== 'settings:edit'),
  attorney: [
    'dashboard:view', 'clients:view', 'clients:edit', 'leads:view', 'cases:view',
    'cases:edit', 'tasks:view', 'tasks:edit', 'documents:view', 'documents:edit',
    'deadlines:view', 'deadlines:edit', 'calendar:view', 'calendar:edit',
    'billing:view', 'reports:view', 'settings:view', 'ai-intake:view', 'ai-intake:edit',
  ],
  paralegal: [
    'dashboard:view', 'clients:view', 'cases:view', 'tasks:view', 'tasks:edit',
    'documents:view', 'documents:edit', 'deadlines:view', 'deadlines:edit',
    'calendar:view', 'calendar:edit', 'settings:view', 'ai-intake:view', 'ai-intake:edit',
  ],
  receptionist: [
    'dashboard:view', 'clients:view', 'clients:edit', 'leads:view', 'leads:edit',
    'calendar:view', 'calendar:edit', 'settings:view',
  ],
  sales: ['dashboard:view', 'leads:view', 'leads:edit', 'clients:view', 'settings:view'],
  viewer: ['dashboard:view', 'clients:view', 'cases:view', 'documents:view', 'settings:view'],
  employee: ['dashboard:view', 'tasks:view', 'tasks:edit', 'calendar:view', 'settings:view'],
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessRoute(role: UserRole | undefined, path: string): boolean {
  const routePermissions: Record<string, Permission> = {
    '/': 'dashboard:view',
    '/clients': 'clients:view',
    '/customers': 'clients:view',
    '/leads': 'leads:view',
    '/cases': 'cases:view',
    '/deals': 'cases:view',
    '/tasks': 'tasks:view',
    '/documents': 'documents:view',
    '/deadlines': 'deadlines:view',
    '/calendar': 'calendar:view',
    '/billing': 'billing:view',
    '/reports': 'reports:view',
    '/settings': 'settings:view',
    '/notifications': 'dashboard:view',
    '/ai-intake': 'ai-intake:view',
    '/migration': 'migration:view',
  };
  const permission = routePermissions[path] ?? (path.startsWith('/ai-intake') ? 'ai-intake:view' as Permission : path.startsWith('/migration') ? 'migration:view' as Permission : undefined);
  if (!permission) return true;
  return hasPermission(role, permission);
}
