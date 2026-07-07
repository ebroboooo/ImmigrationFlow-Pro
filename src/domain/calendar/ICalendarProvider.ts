import type {
  CalendarConnection,
  CalendarListEntry,
  ConnectionStatus,
  SyncProgress,
  SyncResult,
} from './ExternalCalendarEvent';

export interface ICalendarProvider {
  readonly id: 'google' | 'outlook' | 'apple';
  readonly name: string;
  isConfigured(): boolean;
  getConnection(tenantId: string): CalendarConnection | null;
  getConnectionStatus(tenantId: string): ConnectionStatus;
  connect(tenantId: string): Promise<CalendarConnection>;
  disconnect(tenantId: string): Promise<void>;
  listCalendars(tenantId: string): Promise<CalendarListEntry[]>;
  sync(
    tenantId: string,
    calendarIds: string[],
    onProgress?: (progress: SyncProgress) => void,
  ): Promise<SyncResult>;
  updateSettings(
    tenantId: string,
    settings: Partial<Pick<CalendarConnection, 'selectedCalendarIds' | 'defaultCalendarId' | 'autoSync'>>,
  ): CalendarConnection | null;
}
