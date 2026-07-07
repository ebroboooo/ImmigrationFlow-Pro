export type CalendarProviderId = 'google' | 'outlook' | 'apple';

export interface ExternalCalendarEvent {
  id: string;
  tenantId: string;
  provider: CalendarProviderId;
  calendarId: string;
  calendarName: string;
  externalId: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  attendees?: string[];
  color?: string;
  status?: string;
  recurring: boolean;
  organizer?: string;
  timezone?: string;
  syncedAt: Date;
}

export interface CalendarListEntry {
  id: string;
  name: string;
  color?: string;
  primary?: boolean;
  accessRole?: string;
}

export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface SyncProgress {
  phase: 'connecting' | 'fetching' | 'processing' | 'complete';
  calendarName?: string;
  processed: number;
  total: number;
}

export type ConnectionStatus = 'disconnected' | 'connected' | 'expired' | 'error';

export interface CalendarConnection {
  provider: CalendarProviderId;
  email?: string;
  accessToken: string;
  expiresAt: number;
  selectedCalendarIds: string[];
  defaultCalendarId?: string;
  autoSync: boolean;
  connectedAt: string;
  lastSyncAt?: string;
  lastSyncResult?: SyncResult;
  status: ConnectionStatus;
}
