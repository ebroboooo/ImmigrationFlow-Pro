import { useEffect, useState } from 'react';
import {
  CalendarPlus, RefreshCw, Unplug, Settings2, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../../lib/utils';
import { design } from '../../../lib/design';
import { useCalendarSync } from '../../contexts/CalendarSyncContext';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { CalendarListEntry, SyncResult } from '../../../domain/calendar/ExternalCalendarEvent';
import { CalendarImportModal } from './CalendarImportModal';

export function GoogleCalendarPanel() {
  const {
    connection,
    connectionStatus,
    syncing,
    progress,
    lastSyncResult,
    isConfigured,
    connect,
    disconnect,
    listCalendars,
    syncSelected,
    updateSettings,
  } = useCalendarSync();
  const { showToast } = useToast();

  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(connection?.selectedCalendarIds ?? []);
  const [autoSync, setAutoSync] = useState(connection?.autoSync ?? false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(lastSyncResult);

  useEffect(() => {
    setSelectedIds(connection?.selectedCalendarIds ?? []);
    setAutoSync(connection?.autoSync ?? false);
    setLastResult(connection?.lastSyncResult ?? null);
  }, [connection]);

  const statusLabel = {
    disconnected: 'Not connected',
    connected: 'Connected to Google Calendar',
    expired: 'Session expired — reconnect required',
    error: 'Sync error — try again',
  }[connectionStatus];

  const handleConnect = async () => {
    try {
      await connect();
      setShowImport(true);
      showToast('Google account connected. Choose calendars to import.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not connect to Google.', 'error');
    }
  };

  const handleSync = async () => {
    const ids = selectedIds.length ? selectedIds : connection?.selectedCalendarIds ?? [];
    if (!ids.length) {
      setShowImport(true);
      return;
    }
    try {
      const result = await syncSelected(ids);
      setLastResult(result);
      showToast(`Sync complete: ${result.imported} imported, ${result.updated} updated.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Calendar sync failed.', 'error');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setConfirmDisconnect(false);
    showToast('Google Calendar disconnected.');
  };

  const openSettings = async () => {
    setShowSettings(true);
    setLoadingCalendars(true);
    try {
      const list = await listCalendars();
      setCalendars(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load calendars.', 'error');
    } finally {
      setLoadingCalendars(false);
    }
  };

  const saveSettings = () => {
    updateSettings({ selectedCalendarIds: selectedIds, autoSync, defaultCalendarId: selectedIds[0] });
    setShowSettings(false);
    showToast('Calendar settings saved.');
  };

  if (!isConfigured) {
    return (
      <div className="glass-card p-4 sm:p-5 border border-sky-100 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20">
        <p className="text-base font-medium text-gray-900 dark:text-white">Google Calendar</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Add <code className="text-xs bg-white/80 dark:bg-gray-900 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to your environment to enable calendar import.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-sky-600" aria-hidden="true" />
              Google Calendar
            </h2>
            <p className={cn(
              'text-base mt-1 flex items-center gap-2',
              connectionStatus === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400',
            )}>
              {connectionStatus === 'connected' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {statusLabel}
            </p>
            {connection?.lastSyncAt && (
              <p className="text-sm text-gray-500 mt-1">
                Last sync: {format(new Date(connection.lastSyncAt), 'MMM d, yyyy · h:mm a')}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            {connectionStatus === 'disconnected' || connectionStatus === 'expired' ? (
              <button type="button" onClick={() => void handleConnect()} className={cn(design.btn.primary, 'w-full sm:w-auto bg-sky-600 hover:bg-sky-700')}>
                <CalendarPlus className="w-5 h-5" /> Import Google Calendar
              </button>
            ) : (
              <>
                <button type="button" disabled={syncing} onClick={() => void handleSync()} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
                  {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  {syncing ? 'Syncing…' : 'Sync Now'}
                </button>
                <button type="button" onClick={() => void openSettings()} className={cn(design.btn.secondary, 'w-full sm:w-auto')}>
                  <Settings2 className="w-5 h-5" /> Settings
                </button>
                <button type="button" onClick={() => setConfirmDisconnect(true)} className={cn(design.btn.secondary, 'w-full sm:w-auto text-rose-600')}>
                  <Unplug className="w-5 h-5" /> Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {syncing && progress && (
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4" role="status" aria-live="polite">
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {progress.phase === 'complete' ? 'Finishing…' : `Syncing ${progress.calendarName ?? 'calendars'}…`}
            </p>
            <p className="text-sm text-gray-500 mt-1">{progress.processed} of {progress.total} calendars</p>
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${progress.total ? (progress.processed / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {lastResult && !syncing && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              ['Imported', lastResult.imported],
              ['Updated', lastResult.updated],
              ['Skipped', lastResult.skipped],
              ['Failed', lastResult.failed],
            ].map(([label, count]) => (
              <div key={String(label)} className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CalendarImportModal open={showImport} onClose={() => setShowImport(false)} />

      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Calendar Settings"
        footer={
          <>
            <button type="button" onClick={() => setShowSettings(false)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button>
            <button type="button" onClick={saveSettings} className={cn(design.btn.primary, 'flex-1')}>Save Settings</button>
          </>
        }
      >
        <div className="space-y-4">
          {loadingCalendars ? (
            <p className="text-base text-gray-500">Loading your calendars…</p>
          ) : (
            <>
              <p className="text-base text-gray-600 dark:text-gray-400">Choose which Google calendars to sync with ImmigrationFlow.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {calendars.map((cal) => (
                  <label key={cal.id} className="flex items-center gap-3 min-h-12 px-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cal.id)}
                      onChange={(e) => {
                        setSelectedIds((ids) => (e.target.checked ? [...ids, cal.id] : ids.filter((id) => id !== cal.id)));
                      }}
                      className="w-5 h-5 rounded text-sky-600"
                    />
                    <span className="text-base text-gray-900 dark:text-white">{cal.name}{cal.primary ? ' (Primary)' : ''}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-3 min-h-12">
                <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} className="w-5 h-5 rounded text-sky-600" />
                <span className="text-base text-gray-900 dark:text-white">Automatically sync when opening the calendar</span>
              </label>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect Google Calendar?"
        message="Imported Google events will be removed from this calendar view. Your firm appointments and deadlines will not be affected."
        confirmLabel="Disconnect"
        destructive
        onConfirm={() => void handleDisconnect()}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </>
  );
}
