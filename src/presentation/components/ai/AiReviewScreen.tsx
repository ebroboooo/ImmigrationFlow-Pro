import { useEffect, useState } from 'react';
import type { IntakeSession } from '../../../domain/ai/IntakeSession';
import type { AutomationAction } from '../../../domain/ai/AutomationPlan';
import { cn } from '../../../lib/utils';
import { design } from '../../../lib/design';
import { ExtractedFieldsForm } from './ExtractedFieldsForm';
import { DocumentIntelligenceReview } from './DocumentIntelligenceReview';
import { AiCopilotPanel } from './AiCopilotPanel';
import { aiIntakeFileStorage } from '../../../infrastructure/ai/storage/aiIntakeFileStorage';
import { DocumentPreviewPanel } from '../ui/Modal';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';

interface AiReviewScreenProps {
  session: IntakeSession;
  processing: boolean;
  onChange: (session: IntakeSession) => void;
  onApprove: () => void;
  onReject: () => void;
  onRunAutomation: () => void;
}

export function AiReviewScreen({ session, processing, onChange, onApprove, onReject, onRunAutomation }: AiReviewScreenProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    void aiIntakeFileStorage.getObjectUrl(session.file.storageKey).then((u) => {
      url = u;
      setPreviewUrl(u);
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [session.file.storageKey]);

  const patch = (partial: Partial<IntakeSession>) => onChange({ ...session, ...partial });

  const toggleAction = (type: AutomationAction['type']) => {
    patch({
      automationActions: session.automationActions.map((a) =>
        a.type === type ? { ...a, selected: !a.selected } : a,
      ),
    });
  };

  const toggleTask = (id: string) => {
    patch({
      recommendations: {
        ...session.recommendations,
        suggestedTasks: session.recommendations.suggestedTasks.map((t) =>
          t.id === id ? { ...t, selected: !t.selected } : t,
        ),
      },
    });
  };

  const canApprove = session.status === 'awaiting_review' || session.status === 'ocr_pending';
  const canAutomate = session.status === 'approved';

  const scrollToFields = () => {
    document.getElementById('ai-extracted-fields')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 min-w-0 space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/2 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" /> Document Preview
          </h2>
          {previewUrl ? (
            <DocumentPreviewPanel name={session.file.fileName} url={previewUrl} category="USCIS Notices" />
          ) : (
            <div className="glass-card p-8 text-center text-gray-500">Preview unavailable</div>
          )}
        </div>

        <div className="lg:w-1/2 space-y-6">
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Classification</h3>
            <p className="text-base">
              <strong>{session.documentIntelligence?.detection.documentType ?? session.classification?.documentType ?? 'Unknown'}</strong>
              {' '}({Math.round((session.documentIntelligence?.detection.confidence ?? session.classification?.confidence ?? 0) * 100)}% · {session.classification?.source})
            </p>
            {session.documentIntelligence?.detection.reason && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{session.documentIntelligence.detection.reason}</p>
            )}
            {session.ocrRequired && !session.ocrAvailable && (
              <p className="text-base text-amber-700 dark:text-amber-400">Enable OCR in Settings → AI for scanned PDFs and images.</p>
            )}
            {session.ocrMetadata?.skippedOcr && (
              <p className="text-base text-emerald-700 dark:text-emerald-400">Native PDF text detected — OCR was skipped.</p>
            )}
          </div>

          <div className="glass-card p-5" id="ai-extracted-fields">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Extracted Information</h3>
            {session.documentIntelligence ? (
              <DocumentIntelligenceReview
                intelligence={session.documentIntelligence}
                onChange={(documentIntelligence) => patch({ documentIntelligence })}
              />
            ) : (
              <ExtractedFieldsForm
                fields={session.extractedFields}
                onChange={(fields) => patch({ extractedFields: fields })}
              />
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Recommendations</h3>
        <p className="text-base text-gray-700 dark:text-gray-300">{session.recommendations.caseSummary}</p>
        {session.recommendations.attorneySummary && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Attorney:</strong> {session.recommendations.attorneySummary}
          </div>
        )}
        {session.recommendations.clientSummary && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Client:</strong> {session.recommendations.clientSummary}
          </div>
        )}
        {session.recommendations.nextSteps.length > 0 && (
          <ul className="list-disc pl-5 text-base text-gray-600 dark:text-gray-400 space-y-1">
            {session.recommendations.nextSteps.map((s) => <li key={s}>{s}</li>)}
          </ul>
        )}
        {session.recommendations.riskIndicators.length > 0 && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4 text-base text-rose-700 dark:text-rose-300">
            {session.recommendations.riskIndicators.join(' · ')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Suggested Calendar Events</h3>
          {session.recommendations.suggestedCalendarEvents.length === 0 ? (
            <p className="text-sm text-gray-500">No calendar suggestions.</p>
          ) : (
            session.recommendations.suggestedCalendarEvents.map((e) => (
              <label key={e.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={e.selected}
                  onChange={() => patch({
                    recommendations: {
                      ...session.recommendations,
                      suggestedCalendarEvents: session.recommendations.suggestedCalendarEvents.map((ev) =>
                        ev.id === e.id ? { ...ev, selected: !ev.selected } : ev,
                      ),
                    },
                  })}
                  className="w-5 h-5 mt-1"
                />
                <div>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{e.title}</p>
                  <p className="text-sm text-gray-500">{e.type} · {e.start}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="glass-card p-5 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Suggested Deadlines</h3>
          {session.recommendations.suggestedDeadlines.length === 0 ? (
            <p className="text-sm text-gray-500">No deadline suggestions.</p>
          ) : (
            session.recommendations.suggestedDeadlines.map((d) => (
              <label key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.selected}
                  onChange={() => patch({
                    recommendations: {
                      ...session.recommendations,
                      suggestedDeadlines: session.recommendations.suggestedDeadlines.map((dl) =>
                        dl.id === d.id ? { ...dl, selected: !dl.selected } : dl,
                      ),
                    },
                  })}
                  className="w-5 h-5 mt-1"
                />
                <div>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{d.title}</p>
                  <p className="text-sm text-gray-500">{d.type} · {d.date}</p>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Suggested Tasks</h3>
          {session.recommendations.suggestedTasks.map((t) => (
            <label key={t.id} className="flex items-start gap-3 min-h-12 p-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
              <input type="checkbox" checked={t.selected} onChange={() => toggleTask(t.id)} className="w-5 h-5 mt-1" />
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-white">{t.title}</p>
                <p className="text-sm text-gray-500">{t.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="glass-card p-5 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Draft</h3>
          <input
            type="text"
            value={session.recommendations.suggestedEmail.subject}
            onChange={(e) => patch({
              recommendations: {
                ...session.recommendations,
                suggestedEmail: { ...session.recommendations.suggestedEmail, subject: e.target.value },
              },
            })}
            className={design.input}
            placeholder="Subject"
          />
          <textarea
            rows={6}
            value={session.recommendations.suggestedEmail.body}
            onChange={(e) => patch({
              recommendations: {
                ...session.recommendations,
                suggestedEmail: { ...session.recommendations.suggestedEmail, body: e.target.value },
              },
            })}
            className={design.input}
          />
          <p className="text-sm text-gray-500">Draft only — email is not sent automatically.</p>
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Automation Actions</h3>
        <p className="text-base text-gray-600 dark:text-gray-400">Select what to create after you approve. Nothing runs until you confirm.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {session.automationActions.map((a) => (
            <label key={a.type} className={cn('flex items-start gap-3 p-4 rounded-xl border cursor-pointer min-h-14', a.selected ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-gray-200 dark:border-gray-800')}>
              <input type="checkbox" checked={a.selected} onChange={() => toggleAction(a.type)} className="w-5 h-5 mt-0.5" />
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-white">{a.label}</p>
                <p className="text-sm text-gray-500">{a.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {session.automationResults && (
        <div className="glass-card p-5 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Automation Results</h3>
          {session.automationResults.map((r) => (
            <p key={r.action} className={cn('text-base', r.success ? 'text-emerald-600' : 'text-rose-600')}>{r.message}</p>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-gray-50/95 dark:bg-gray-950/95 py-4 border-t border-gray-200 dark:border-gray-800">
        {canApprove && (
          <>
            <button type="button" disabled={processing} onClick={onReject} className={cn(design.btn.secondary, 'flex-1 text-rose-600')}>
              <XCircle className="w-5 h-5" /> Reject
            </button>
            <button type="button" disabled={processing} onClick={onApprove} className={cn(design.btn.primary, 'flex-1')}>
              <CheckCircle2 className="w-5 h-5" /> Approve for Automation
            </button>
          </>
        )}
        {canAutomate && (
          <button type="button" disabled={processing} onClick={onRunAutomation} className={cn(design.btn.primary, 'flex-1')}>
            Run Selected Automations
          </button>
        )}
      </div>
    </div>

      <AiCopilotPanel
        session={session}
        processing={processing}
        onApprove={onApprove}
        onReject={onReject}
        onEdit={scrollToFields}
      />
    </div>
  );
}
