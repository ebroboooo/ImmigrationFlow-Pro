import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  CalendarConnection,
  CalendarListEntry,
  ConnectionStatus,
  ExternalCalendarEvent,
  SyncProgress,
  SyncResult,
} from '../../domain/calendar/ExternalCalendarEvent';
import type { ICalendarProvider } from '../../domain/calendar/ICalendarProvider';
import { googleCalendarProvider } from '../../infrastructure/calendar/GoogleCalendarProvider';
import { externalCalendarStorage } from '../../infrastructure/calendar/externalCalendarStorage';
import { useAuth } from './AuthContext';

interface CalendarSyncContextValue {
  provider: ICalendarProvider;
  connection: CalendarConnection | null;
  connectionStatus: ConnectionStatus;
  externalEvents: ExternalCalendarEvent[];
  syncing: boolean;
  progress: SyncProgress | null;
  lastSyncResult: SyncResult | null;
  isConfigured: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  listCalendars: () => Promise<CalendarListEntry[]>;
  syncSelected: (calendarIds: string[]) => Promise<SyncResult>;
  updateSettings: (settings: Partial<Pick<CalendarConnection, 'selectedCalendarIds' | 'defaultCalendarId' | 'autoSync'>>) => void;
  refreshEvents: () => void;
}

const CalendarSyncContext = createContext<CalendarSyncContextValue | null>(null);

export function CalendarSyncProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useAuth();
  const provider = googleCalendarProvider;
  const [connection, setConnection] = useState<CalendarConnection | null>(() => externalCalendarStorage.getConnection(tenantId));
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>(() => externalCalendarStorage.getEvents(tenantId));
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const refreshEvents = useCallback(() => {
    setConnection(externalCalendarStorage.getConnection(tenantId));
    setExternalEvents(externalCalendarStorage.getEvents(tenantId));
  }, [tenantId]);

  const connectionStatus = provider.getConnectionStatus(tenantId);

  const connect = useCallback(async () => {
    const conn = await provider.connect(tenantId);
    setConnection(conn);
  }, [provider, tenantId]);

  const disconnect = useCallback(async () => {
    await provider.disconnect(tenantId);
    setConnection(null);
    setExternalEvents([]);
  }, [provider, tenantId]);

  const listCalendars = useCallback(async () => provider.listCalendars(tenantId), [provider, tenantId]);

  const syncSelected = useCallback(async (calendarIds: string[]) => {
    setSyncing(true);
    setProgress({ phase: 'connecting', processed: 0, total: calendarIds.length });
    try {
      const result = await provider.sync(tenantId, calendarIds, setProgress);
      refreshEvents();
      return result;
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  }, [provider, tenantId, refreshEvents]);

  const updateSettings = useCallback((
    settings: Partial<Pick<CalendarConnection, 'selectedCalendarIds' | 'defaultCalendarId' | 'autoSync'>>,
  ) => {
    const updated = provider.updateSettings(tenantId, settings);
    if (updated) setConnection(updated);
  }, [provider, tenantId]);

  const value = useMemo((): CalendarSyncContextValue => ({
    provider,
    connection,
    connectionStatus,
    externalEvents,
    syncing,
    progress,
    lastSyncResult: connection?.lastSyncResult ?? null,
    isConfigured: provider.isConfigured(),
    connect,
    disconnect,
    listCalendars,
    syncSelected,
    updateSettings,
    refreshEvents,
  }), [
    provider, connection, connectionStatus, externalEvents, syncing, progress,
    connect, disconnect, listCalendars, syncSelected, updateSettings, refreshEvents,
  ]);

  return (
    <CalendarSyncContext.Provider value={value}>
      {children}
    </CalendarSyncContext.Provider>
  );
}

export function useCalendarSync() {
  const ctx = useContext(CalendarSyncContext);
  if (!ctx) throw new Error('useCalendarSync must be used within CalendarSyncProvider');
  return ctx;
}
