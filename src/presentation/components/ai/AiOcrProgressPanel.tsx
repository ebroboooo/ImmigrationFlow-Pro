import type { IntakeOCRMetadata } from '../../../domain/ai/OCRUsage';
import { cn } from '../../../lib/utils';
import { RefreshCw, X } from 'lucide-react';

interface AiOcrProgressPanelProps {
  ocrMetadata?: IntakeOCRMetadata;
  onCancel?: () => void;
}

export function AiOcrProgressPanel({ ocrMetadata, onCancel }: AiOcrProgressPanelProps) {
  const progress = ocrMetadata?.progress;
  if (!progress) return null;

  const pct = progress.totalPages > 0
    ? Math.round((progress.currentPage / progress.totalPages) * 100)
    : 0;

  return (
    <div className="glass-card p-5 space-y-4 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="font-medium">Document Reading</span>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-rose-600 flex items-center gap-1 min-h-10 px-2">
            <X className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{progress.message ?? 'Processing…'}</p>
      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={cn('h-full bg-indigo-500 transition-all duration-300')}
          style={{ width: `${Math.max(pct, progress.stage === 'detecting' ? 5 : pct)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          Page {progress.currentPage} / {progress.totalPages || '—'}
        </span>
        {progress.confidence != null && (
          <span>Confidence: {Math.round(progress.confidence * 100)}%</span>
        )}
      </div>
    </div>
  );
}
