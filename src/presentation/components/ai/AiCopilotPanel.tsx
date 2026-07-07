import type { IntakeSession } from '../../../domain/ai/IntakeSession';
import { cn } from '../../../lib/utils';
import { design } from '../../../lib/design';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Edit3,
  FileWarning,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';

interface AiCopilotPanelProps {
  session: IntakeSession;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}

const RISK_STYLES = {
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  critical: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
} as const;

export function AiCopilotPanel({ session, processing, onApprove, onReject, onEdit }: AiCopilotPanelProps) {
  const meta = session.aiMetadata;
  const risk = session.recommendations.riskLevel ?? meta?.riskLevel ?? 'medium';
  const confidence = meta?.overallConfidence ?? session.extractedFields.overallConfidence;
  const analysisComplete = meta?.analysisComplete ?? session.status === 'awaiting_review';
  const warnings = [...(meta?.warnings ?? []), ...(session.recommendations.warnings ?? [])];
  const missing = session.recommendations.requiredDocuments;
  const canAct = session.status === 'awaiting_review' || session.status === 'ocr_pending';

  const suggestedActions = [
    ...session.recommendations.suggestedTasks.filter((t) => t.selected).map((t) => t.title),
    ...session.recommendations.nextSteps.slice(0, 3),
  ];

  return (
    <aside className="w-full xl:w-80 shrink-0 space-y-4">
      <div className="glass-card p-5 space-y-4 sticky top-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Copilot</h3>
        </div>

        <div className="flex items-center gap-2 text-base">
          {analysisComplete ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          )}
          <span className="text-gray-700 dark:text-gray-300">
            {analysisComplete ? 'Analysis complete' : 'Analysis in progress…'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
            <p className="text-gray-500">Confidence</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(confidence * 100)}%</p>
          </div>
          <div className={cn('rounded-lg p-3', RISK_STYLES[risk])}>
            <p className="opacity-80">Risk</p>
            <p className="text-lg font-semibold capitalize">{risk}</p>
          </div>
        </div>

        {meta?.providerId && (
          <p className="text-xs text-gray-500">
            Provider: {meta.providerId}
            {meta.model ? ` · ${meta.model}` : ''}
            {meta.usage?.latencyMs != null ? ` · ${meta.usage.latencyMs}ms` : ''}
          </p>
        )}

        {suggestedActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> Suggested Actions
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-4">
              {suggestedActions.slice(0, 5).map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        )}

        {missing.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <FileWarning className="w-4 h-4" /> Missing Documents
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-4">
              {missing.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Warnings
            </p>
            {warnings.map((w) => (
              <p key={w} className="text-sm text-amber-700 dark:text-amber-400">{w}</p>
            ))}
          </div>
        )}

        {session.recommendations.riskIndicators.length > 0 && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3">
            <p className="text-sm font-medium text-rose-800 dark:text-rose-300 flex items-center gap-1 mb-1">
              <ShieldAlert className="w-4 h-4" /> Risk Indicators
            </p>
            <p className="text-sm text-rose-700 dark:text-rose-400">{session.recommendations.riskIndicators.join(' · ')}</p>
          </div>
        )}

        {canAct && (
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button type="button" disabled={processing} onClick={onApprove} className={cn(design.btn.primary, 'w-full')}>
              <CheckCircle2 className="w-5 h-5" /> Approve
            </button>
            <button type="button" disabled={processing} onClick={onEdit} className={cn(design.btn.secondary, 'w-full')}>
              <Edit3 className="w-5 h-5" /> Edit
            </button>
            <button type="button" disabled={processing} onClick={onReject} className={cn(design.btn.secondary, 'w-full text-rose-600')}>
              <XCircle className="w-5 h-5" /> Reject
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">Nothing is saved to CRM until you approve selected automations.</p>
      </div>
    </aside>
  );
}
