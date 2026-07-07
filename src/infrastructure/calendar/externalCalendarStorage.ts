import type {
  CalendarConnection,
  ExternalCalendarEvent,
  SyncResult,
} from '../../domain/calendar/ExternalCalendarEvent';

const CONNECTION_KEY_PREFIX = 'immflow_calendar_connection_';
const EVENTS_KEY_PREFIX = 'immflow_external_calendar_events_';

function reviveEvent(raw: ExternalCalendarEvent): ExternalCalendarEvent {
  return {
    ...raw,
    start: new Date(raw.start),
    end: new Date(raw.end),
    syncedAt: new Date(raw.syncedAt),
  };
}

export class ExternalCalendarStorage {
  getConnection(tenantId: string): CalendarConnection | null {
    const raw = localStorage.getItem(`${CONNECTION_KEY_PREFIX}${tenantId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CalendarConnection;
    } catch {
      return null;
    }
  }

  saveConnection(tenantId: string, connection: CalendarConnection): void {
    localStorage.setItem(`${CONNECTION_KEY_PREFIX}${tenantId}`, JSON.stringify(connection));
  }

  clearConnection(tenantId: string): void {
    localStorage.removeItem(`${CONNECTION_KEY_PREFIX}${tenantId}`);
  }

  getEvents(tenantId: string): ExternalCalendarEvent[] {
    const raw = localStorage.getItem(`${EVENTS_KEY_PREFIX}${tenantId}`);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as ExternalCalendarEvent[];
      return parsed.map(reviveEvent);
    } catch {
      return [];
    }
  }

  upsertEvents(tenantId: string, incoming: ExternalCalendarEvent[]): SyncResult {
    const existing = this.getEvents(tenantId);
    const byId = new Map(existing.map((e) => [e.id, e]));
    const result: SyncResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    for (const event of incoming) {
      try {
        const prev = byId.get(event.id);
        if (!prev) {
          byId.set(event.id, event);
          result.imported += 1;
        } else if (
          prev.title !== event.title
          || prev.start.getTime() !== event.start.getTime()
          || prev.end.getTime() !== event.end.getTime()
          || prev.location !== event.location
        ) {
          byId.set(event.id, event);
          result.updated += 1;
        } else {
          result.skipped += 1;
        }
      } catch {
        result.failed += 1;
        result.errors.push(`Could not save "${event.title}".`);
      }
    }

    localStorage.setItem(`${EVENTS_KEY_PREFIX}${tenantId}`, JSON.stringify([...byId.values()]));
    return result;
  }

  removeProviderEvents(tenantId: string, provider: CalendarConnection['provider']): void {
    const kept = this.getEvents(tenantId).filter((e) => e.provider !== provider);
    localStorage.setItem(`${EVENTS_KEY_PREFIX}${tenantId}`, JSON.stringify(kept));
  }
}

export const externalCalendarStorage = new ExternalCalendarStorage();
