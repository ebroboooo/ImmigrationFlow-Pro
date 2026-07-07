import type { IntakeSession } from '../../../domain/ai/IntakeSession';
import type { IntakeAuditRecord } from '../../../domain/ai/IntakeAudit';

const SESSION_KEY_PREFIX = 'immflow_ai_intake_sessions_';

function reviveSession(raw: IntakeSession): IntakeSession {
  return raw;
}

export class IntakeSessionStorage {
  getAll(tenantId: string): IntakeSession[] {
    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${tenantId}`);
    if (!raw) return [];
    try {
      return (JSON.parse(raw) as IntakeSession[]).map(reviveSession);
    } catch {
      return [];
    }
  }

  getById(tenantId: string, sessionId: string): IntakeSession | null {
    return this.getAll(tenantId).find((s) => s.id === sessionId) ?? null;
  }

  save(session: IntakeSession): void {
    const all = this.getAll(session.tenantId);
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx === -1) all.unshift(session);
    else all[idx] = session;
    localStorage.setItem(`${SESSION_KEY_PREFIX}${session.tenantId}`, JSON.stringify(all));
  }

  appendAudit(session: IntakeSession, record: IntakeAuditRecord): IntakeSession {
    const updated = {
      ...session,
      audit: [...session.audit, record],
      updatedAt: new Date().toISOString(),
    };
    this.save(updated);
    return updated;
  }
}

export const intakeSessionStorage = new IntakeSessionStorage();

export function createAuditRecord(
  event: IntakeAuditRecord['event'],
  partial: Partial<IntakeAuditRecord> = {},
): IntakeAuditRecord {
  return {
    id: crypto.randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    ...partial,
  };
}
