import type { CaseCopilotInsights } from '../../../domain/ai/CaseCopilot';
import type { CopilotScope } from '../../../domain/ai/CaseContext';

const INSIGHTS_PREFIX = 'immflow_copilot_insights_';

function scopeKey(tenantId: string, scope: CopilotScope): string {
  const id = scope.type === 'case' ? `${scope.clientId}_${scope.caseId}` : scope.clientId;
  return `${tenantId}_${scope.type}_${id}`;
}

interface CachedInsights {
  fingerprint: string;
  insights: CaseCopilotInsights;
  cachedAt: string;
}

export function getCachedInsights(
  tenantId: string,
  scope: CopilotScope,
  fingerprint: string,
): CaseCopilotInsights | null {
  try {
    const raw = localStorage.getItem(`${INSIGHTS_PREFIX}${scopeKey(tenantId, scope)}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedInsights;
    if (cached.fingerprint !== fingerprint) return null;
    return { ...cached.insights, fromCache: true };
  } catch {
    return null;
  }
}

export function setCachedInsights(
  tenantId: string,
  scope: CopilotScope,
  fingerprint: string,
  insights: CaseCopilotInsights,
): void {
  const entry: CachedInsights = {
    fingerprint,
    insights: { ...insights, fromCache: false },
    cachedAt: new Date().toISOString(),
  };
  localStorage.setItem(`${INSIGHTS_PREFIX}${scopeKey(tenantId, scope)}`, JSON.stringify(entry));
}

export function invalidateCopilotCache(tenantId: string, scope: CopilotScope): void {
  localStorage.removeItem(`${INSIGHTS_PREFIX}${scopeKey(tenantId, scope)}`);
}
