import type { UserRole } from '../../domain/models/User';
import type { CopilotScope } from '../../domain/ai/CaseContext';
import { hasPermission } from '../../lib/permissions';

export function assertCaseCopilotAccess(role: UserRole | undefined, scope: CopilotScope): void {
  if (!role) throw new Error('Authentication required.');
  if (scope.type === 'client' && !hasPermission(role, 'clients:view')) {
    throw new Error('You do not have permission to view this client.');
  }
  if (scope.type === 'case' && !hasPermission(role, 'cases:view')) {
    throw new Error('You do not have permission to view this case.');
  }
}
