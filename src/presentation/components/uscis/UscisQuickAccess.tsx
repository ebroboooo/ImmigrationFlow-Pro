import { useRef, useState, useEffect } from 'react';
import { CheckCircle2, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import type { Case } from '../../../domain/models/Sales';
import {
  copyAndOpenOfficialUscis,
  copyReceiptToClipboard,
  getRecentUscisReceipt,
  normalizeReceiptForClipboard,
  saveRecentUscisReceipt,
} from '../../../lib/uscisQuickAccess';
import { cn } from '../../../lib/utils';

interface UscisQuickAccessProps {
  cases?: Case[];
}

type Toast = {
  tone: 'success' | 'info';
  title: string;
  detail?: string;
};

export function UscisQuickAccess({ cases = [] }: UscisQuickAccessProps) {
  const [receiptInput, setReceiptInput] = useState('');
  const [recentReceipt, setRecentReceipt] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentReceipt(getRecentUscisReceipt());
  }, []);

  const showToast = (next: Toast) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 6000);
  };

  const requireReceipt = (): string | null => {
    const trimmed = receiptInput.trim();
    if (!trimmed) {
      showToast({
        tone: 'info',
        title: 'Receipt number is required.',
        detail: 'Enter a USCIS receipt number before continuing.',
      });
      inputRef.current?.focus();
      return null;
    }
    const normalized = normalizeReceiptForClipboard(trimmed);
    setReceiptInput(normalized);
    return normalized;
  };

  const handleCopyAndOpen = async () => {
    const normalized = requireReceipt();
    if (!normalized) return;

    const result = await copyAndOpenOfficialUscis(normalized, inputRef.current);
    setRecentReceipt(normalized);

    if (result === 'copied') {
      showToast({
        tone: 'success',
        title: 'Receipt number copied to clipboard.',
        detail:
          'The official USCIS Case Status page has been opened. Simply paste (Ctrl+V) the receipt number into the search box.',
      });
      return;
    }

    showToast({
      tone: 'info',
      title: 'Official USCIS page opened.',
      detail: 'Press Ctrl+C to copy the selected receipt number, then paste it on the USCIS website.',
    });
  };

  const handleCopyOnly = async () => {
    const normalized = requireReceipt();
    if (!normalized) return;

    const result = await copyReceiptToClipboard(normalized, inputRef.current);
    saveRecentUscisReceipt(normalized);
    setRecentReceipt(normalized);

    if (result === 'copied') {
      showToast({ tone: 'success', title: 'Receipt number copied.' });
      return;
    }

    showToast({
      tone: 'info',
      title: 'Press Ctrl+C to copy.',
      detail: 'Your receipt number has been selected.',
    });
  };

  const handleOpenAgain = async () => {
    if (!recentReceipt) return;
    setReceiptInput(recentReceipt);
    const result = await copyAndOpenOfficialUscis(recentReceipt, inputRef.current);

    if (result === 'copied') {
      showToast({
        tone: 'success',
        title: 'Recent receipt copied. USCIS opened in a new tab.',
      });
      return;
    }

    showToast({
      tone: 'info',
      title: 'USCIS opened. Press Ctrl+C to copy the recent receipt.',
    });
  };

  const casesWithReceipt = cases.filter((c) => c.uscisReceiptNumber);

  return (
    <section className="glass-card p-4 sm:p-5 space-y-4" aria-labelledby="uscis-quick-access-title">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="uscis-quick-access-title" className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
            USCIS Case Status
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Search is performed directly on the official USCIS website to ensure the most accurate and up-to-date case information.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="uscis-receipt-number" className="block text-xs font-medium text-gray-600 dark:text-gray-400">
          Receipt Number
        </label>
        <input
          ref={inputRef}
          id="uscis-receipt-number"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="Enter receipt number e.g. IOE1234567890"
          value={receiptInput}
          onChange={(e) => setReceiptInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCopyAndOpen();
            }
          }}
          aria-describedby="uscis-receipt-help"
          className="w-full min-h-11 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
        />
        <p id="uscis-receipt-help" className="text-xs text-gray-500 dark:text-gray-400">
          Whitespace is removed automatically and the receipt number is converted to uppercase when copied.
        </p>
      </div>

      <div className="flex flex-col xs:flex-row gap-3">
        <button
          type="button"
          onClick={() => void handleCopyAndOpen()}
          aria-label="Copy receipt number and open official USCIS Case Status website in a new tab"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
          Copy &amp; Open Official USCIS
        </button>
        <button
          type="button"
          onClick={() => void handleCopyOnly()}
          aria-label="Copy receipt number to clipboard"
          className="inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
          Copy Receipt
        </button>
      </div>

      {recentReceipt && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/20 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Recent Receipt</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white truncate">{recentReceipt}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleOpenAgain()}
            className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            Open Again
          </button>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 text-sm px-3 py-3 rounded-xl border',
            toast.tone === 'success'
              ? 'text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
          )}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">{toast.title}</p>
            {toast.detail && <p className="mt-1 text-xs opacity-90 leading-relaxed">{toast.detail}</p>}
          </div>
        </div>
      )}

      {casesWithReceipt.length > 0 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick fill from cases:</p>
          <div className="flex flex-wrap gap-2">
            {casesWithReceipt.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setReceiptInput(c.uscisReceiptNumber ?? '')}
                className="min-h-9 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {c.uscisReceiptNumber}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
