import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { design } from '../../../lib/design';
import { Modal } from '../ui/Modal';
import { useCalendarSync } from '../../contexts/CalendarSyncContext';
import { useToast } from '../../contexts/ToastContext';
import type { CalendarListEntry, SyncResult } from '../../../domain/calendar/ExternalCalendarEvent';

interface CalendarImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function CalendarImportModal({ open, onClose }: CalendarImportModalProps) {
  const { listCalendars, syncSelected, syncing, progress, connection } = useCalendarSync();
  const { showToast } = useToast();
  const [step, setStep] = useState<'select' | 'importing' | 'done'>('select');
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('select');
      setResult(null);
      return;
    }
    setSelected(connection?.selectedCalendarIds ?? []);
    setLoading(true);
    void listCalendars()
      .then(setCalendars)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Could not load calendars.', 'error'))
      .finally(() => setLoading(false));
  }, [open, listCalendars, connection?.selectedCalendarIds, showToast]);

  const runImport = async () => {
    if (!selected.length) {
      showToast('Please select at least one calendar.', 'error');
      return;
    }
    setStep('importing');
    try {
      const syncResult = await syncSelected(selected);
      setResult(syncResult);
      setStep('done');
      showToast(`Import complete: ${syncResult.imported} new events added.`);
    } catch (err) {
      setStep('select');
      showToast(err instanceof Error ? err.message : 'Import failed.', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'done' ? 'Import Complete' : 'Import Google Calendar'}
      size="lg"
      footer={
        step === 'select' ? (
          <>
            <button type="button" onClick={onClose} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button>
            <button type="button" disabled={!selected.length || syncing} onClick={() => void runImport()} className={cn(design.btn.primary, 'flex-1')}>
              Import Selected
            </button>
          </>
        ) : step === 'done' ? (
          <button type="button" onClick={onClose} className={cn(design.btn.primary, 'w-full')}>Done</button>
        ) : undefined
      }
    >
      {step === 'select' && (
        <div className="space-y-4">
          <p className="text-base text-gray-600 dark:text-gray-400">
            Select the Google calendars you want to show alongside your firm appointments, deadlines, and tasks.
          </p>
          {loading ? (
            <p className="text-base text-gray-500">Loading your calendars…</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {calendars.map((cal) => (
                <label key={cal.id} className="flex items-center gap-3 min-h-12 px-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/20">
                  <input
                    type="checkbox"
                    checked={selected.includes(cal.id)}
                    onChange={(e) => setSelected((ids) => (e.target.checked ? [...ids, cal.id] : ids.filter((id) => id !== cal.id)))}
                    className="w-5 h-5 rounded text-sky-600"
                  />
                  <span className="text-base text-gray-900 dark:text-white">{cal.name}{cal.primary ? ' (Primary)' : ''}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'importing' && (
        <div className="py-8 text-center space-y-4" role="status" aria-live="polite">
          <Loader2 className="w-10 h-10 animate-spin text-sky-600 mx-auto" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">Importing events…</p>
          {progress && (
            <p className="text-base text-gray-500">
              {progress.calendarName ? `Syncing ${progress.calendarName}` : 'Connecting…'} ({progress.processed}/{progress.total})
            </p>
          )}
        </div>
      )}

      {step === 'done' && result && (
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Imported', result.imported, 'text-emerald-600'],
            ['Updated', result.updated, 'text-blue-600'],
            ['Skipped', result.skipped, 'text-gray-500'],
            ['Failed', result.failed, 'text-rose-600'],
          ].map(([label, count, color]) => (
            <div key={String(label)} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className={cn('text-3xl font-bold', color)}>{count}</div>
              <div className="text-base text-gray-600 dark:text-gray-400 mt-1">{label}</div>
            </div>
          ))}
          {result.errors.length > 0 && (
            <div className="col-span-2 text-sm text-rose-600 dark:text-rose-400">
              {result.errors.slice(0, 3).join(' ')}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
