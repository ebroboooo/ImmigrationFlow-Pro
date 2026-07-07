import type { ICalendarProvider } from '../../domain/calendar/ICalendarProvider';
import type {
  CalendarConnection,
  CalendarListEntry,
  ConnectionStatus,
  SyncProgress,
  SyncResult,
} from '../../domain/calendar/ExternalCalendarEvent';
import { googleAuthService } from '../auth/GoogleAuthService';
import { calendarConfig } from './calendarConfig';
import { externalCalendarStorage } from './externalCalendarStorage';
import { mapGoogleEvent, type GoogleApiEvent } from './googleEventMapper';

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
  accessRole?: string;
}

interface GoogleEventsResponse {
  items?: GoogleApiEvent[];
  nextPageToken?: string;
}

async function calendarFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${calendarConfig.calendarApiBase}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error('Your Google session expired. Please connect again.');
  if (res.status === 403) throw new Error('Calendar access was denied. Check Google permissions.');
  if (res.status === 404) throw new Error('That calendar is no longer available.');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || 'Could not reach Google Calendar. Check your internet connection.');
  }
  return res.json() as Promise<T>;
}

export class GoogleCalendarProvider implements ICalendarProvider {
  readonly id = 'google' as const;
  readonly name = 'Google Calendar';

  isConfigured(): boolean {
    return googleAuthService.isConfigured();
  }

  getConnection(tenantId: string): CalendarConnection | null {
    return externalCalendarStorage.getConnection(tenantId);
  }

  getConnectionStatus(tenantId: string): ConnectionStatus {
    const conn = this.getConnection(tenantId);
    if (!conn) return 'disconnected';
    if (conn.expiresAt <= Date.now()) return 'expired';
    if (conn.status === 'error') return 'error';
    return 'connected';
  }

  async connect(tenantId: string): Promise<CalendarConnection> {
    const tokens = await googleAuthService.signIn([calendarConfig.googleScopes]);
    googleAuthService.saveTokens(tenantId, tokens);

    const calendars = await this.listCalendarsWithToken(tokens.accessToken);
    const primary = calendars.find((c) => c.primary)?.id ?? calendars[0]?.id;

    const connection: CalendarConnection = {
      provider: 'google',
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      selectedCalendarIds: primary ? [primary] : [],
      defaultCalendarId: primary,
      autoSync: false,
      connectedAt: new Date().toISOString(),
      status: 'connected',
    };
    externalCalendarStorage.saveConnection(tenantId, connection);
    return connection;
  }

  async disconnect(tenantId: string): Promise<void> {
    const conn = this.getConnection(tenantId);
    if (conn?.accessToken) {
      await googleAuthService.revokeToken(conn.accessToken);
    }
    googleAuthService.clearTokens(tenantId);
    externalCalendarStorage.clearConnection(tenantId);
    externalCalendarStorage.removeProviderEvents(tenantId, 'google');
  }

  async listCalendars(tenantId: string): Promise<CalendarListEntry[]> {
    const token = await googleAuthService.getValidAccessToken(tenantId, [calendarConfig.googleScopes]);
    return this.listCalendarsWithToken(token);
  }

  private async listCalendarsWithToken(accessToken: string): Promise<CalendarListEntry[]> {
    const data = await calendarFetch<{ items?: GoogleCalendarListItem[] }>(
      '/users/me/calendarList?minAccessRole=reader',
      accessToken,
    );
    return (data.items ?? []).map((c) => ({
      id: c.id,
      name: c.summary,
      color: c.backgroundColor,
      primary: c.primary,
      accessRole: c.accessRole,
    }));
  }

  async sync(
    tenantId: string,
    calendarIds: string[],
    onProgress?: (progress: SyncProgress) => void,
  ): Promise<SyncResult> {
    onProgress?.({ phase: 'connecting', processed: 0, total: calendarIds.length });

    let accessToken: string;
    try {
      accessToken = await googleAuthService.getValidAccessToken(tenantId, [calendarConfig.googleScopes]);
    } catch (err) {
      const conn = this.getConnection(tenantId);
      if (conn) {
        externalCalendarStorage.saveConnection(tenantId, { ...conn, status: 'expired' });
      }
      throw err;
    }

    const conn = this.getConnection(tenantId);
    if (conn) {
      externalCalendarStorage.saveConnection(tenantId, {
        ...conn,
        accessToken,
        expiresAt: googleAuthService.getStoredTokens(tenantId)?.expiresAt ?? conn.expiresAt,
        status: 'connected',
      });
    }

    const aggregate: SyncResult = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 3);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 12);

    for (let i = 0; i < calendarIds.length; i += 1) {
      const calendarId = calendarIds[i];
      const calendars = await this.listCalendarsWithToken(accessToken);
      const meta = calendars.find((c) => c.id === calendarId);
      onProgress?.({
        phase: 'fetching',
        calendarName: meta?.name,
        processed: i,
        total: calendarIds.length,
      });

      try {
        const events = await this.fetchAllEvents(accessToken, calendarId, timeMin, timeMax);
        onProgress?.({ phase: 'processing', calendarName: meta?.name, processed: i + 1, total: calendarIds.length });
        const mapped = events
          .map((e) => mapGoogleEvent(e, tenantId, calendarId, meta?.name ?? 'Google Calendar', meta?.color))
          .filter(Boolean) as import('../../domain/calendar/ExternalCalendarEvent').ExternalCalendarEvent[];
        const partial = externalCalendarStorage.upsertEvents(tenantId, mapped);
        aggregate.imported += partial.imported;
        aggregate.updated += partial.updated;
        aggregate.skipped += partial.skipped;
        aggregate.failed += partial.failed;
        aggregate.errors.push(...partial.errors);
      } catch (err) {
        aggregate.failed += 1;
        aggregate.errors.push(err instanceof Error ? err.message : `Failed to sync ${meta?.name ?? 'calendar'}.`);
      }
    }

    onProgress?.({ phase: 'complete', processed: calendarIds.length, total: calendarIds.length });

    if (conn) {
      externalCalendarStorage.saveConnection(tenantId, {
        ...conn,
        selectedCalendarIds: calendarIds,
        lastSyncAt: new Date().toISOString(),
        lastSyncResult: aggregate,
        status: aggregate.failed > 0 && aggregate.imported + aggregate.updated === 0 ? 'error' : 'connected',
      });
    }

    return aggregate;
  }

  private async fetchAllEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<GoogleApiEvent[]> {
    const encoded = encodeURIComponent(calendarId);
    const all: GoogleApiEvent[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      });
      if (pageToken) params.set('pageToken', pageToken);
      const data = await calendarFetch<GoogleEventsResponse>(
        `/calendars/${encoded}/events?${params.toString()}`,
        accessToken,
      );
      all.push(...(data.items ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return all;
  }

  updateSettings(
    tenantId: string,
    settings: Partial<Pick<CalendarConnection, 'selectedCalendarIds' | 'defaultCalendarId' | 'autoSync'>>,
  ): CalendarConnection | null {
    const conn = this.getConnection(tenantId);
    if (!conn) return null;
    const updated = { ...conn, ...settings };
    externalCalendarStorage.saveConnection(tenantId, updated);
    return updated;
  }
}

export const googleCalendarProvider = new GoogleCalendarProvider();
