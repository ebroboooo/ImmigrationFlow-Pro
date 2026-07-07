import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAiIntake } from '../contexts/AiIntakeContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { AiUploadZone } from '../components/ai/AiUploadZone';
import { AiReviewScreen } from '../components/ai/AiReviewScreen';
import { AiOcrProgressPanel } from '../components/ai/AiOcrProgressPanel';
import { cn } from '../../lib/utils';
import { design } from '../../lib/design';

export const AiIntake = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const {
    sessions,
    activeSession,
    processing,
    llmStatus,
    ocrStatus,
    cancelProcessing,
    uploadAndAnalyze,
    selectSession,
    updateSession,
    approve,
    reject,
    runAutomation,
  } = useAiIntake();
  const { showToast } = useToast();

  useEffect(() => {
    selectSession(sessionId ?? null);
  }, [sessionId, selectSession]);

  const session = sessionId
    ? (activeSession?.id === sessionId ? activeSession : sessions.find((s) => s.id === sessionId))
    : null;

  const handleUpload = useCallback(async (file: File) => {
    try {
      const created = await uploadAndAnalyze(file);
      navigate(`/ai-intake/${created.id}`);
      showToast('Document analyzed. Please review before approving.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Analysis failed.', 'error');
    }
  }, [uploadAndAnalyze, navigate, showToast]);

  const handleApprove = async () => {
    if (!session) return;
    updateSession(session);
    await approve(session);
    showToast('Approved. Select automations and run when ready.');
  };

  const handleReject = async () => {
    if (!session) return;
    await reject(session);
    showToast('Intake rejected.', 'info');
    navigate('/ai-intake');
  };

  const handleAutomation = async () => {
    if (!session) return;
    try {
      await runAutomation(session);
      showToast('Automation completed.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Automation failed.', 'error');
    }
  };

  if (sessionId && session) {
    return (
      <div className={design.page}>
        <PageHeader title="Review Intake" description={session.file.fileName} icon={Sparkles} />
        <button type="button" onClick={() => navigate('/ai-intake')} className={cn(design.btn.secondary, 'mb-4')}>← Back to Upload</button>
        {session.status === 'failed' && (
          <div className="mb-4 flex items-center gap-2 text-base text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl">
            <AlertCircle className="w-5 h-5" /> {session.errorMessage}
          </div>
        )}
        {processing && activeSession?.ocrMetadata?.progress && (
          <AiOcrProgressPanel ocrMetadata={activeSession.ocrMetadata} onCancel={cancelProcessing} />
        )}
        {session.status === 'ocr_pending' && (
          <div className="mb-4 flex items-center gap-2 text-base text-amber-700 bg-amber-50 p-4 rounded-xl">
            <Clock className="w-5 h-5" /> OCR could not extract text. Enable OCR in Settings → AI or upload a text-searchable PDF.
          </div>
        )}
        <AiReviewScreen
          session={session}
          processing={processing}
          onChange={updateSession}
          onApprove={() => void handleApprove()}
          onReject={() => void handleReject()}
          onRunAutomation={() => void handleAutomation()}
        />
      </div>
    );
  }

  return (
    <div className={design.page}>
      <PageHeader
        title="AI Intake Assistant"
        description="Upload immigration documents for intelligent extraction and review"
        icon={Sparkles}
      />

      <div className="glass-card p-4 sm:p-5 mb-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="text-base text-gray-700 dark:text-gray-300">
          <p><strong>AI Provider:</strong> {llmStatus.configured ? llmStatus.providerName : 'Not connected — pattern extraction active'}</p>
          <p><strong>OCR:</strong> {ocrStatus.configured ? `${ocrStatus.providerName} — ready` : 'Not configured — enable in Settings → AI'}</p>
        </div>
        <p className="text-sm text-gray-500 max-w-md">Nothing is saved to your CRM until you approve and run automations.</p>
      </div>

      {processing && activeSession?.ocrMetadata?.progress && (
        <AiOcrProgressPanel ocrMetadata={activeSession.ocrMetadata} onCancel={cancelProcessing} />
      )}

      <AiUploadZone onUpload={(f) => void handleUpload(f)} processing={processing} />

      {sessions.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Intake Sessions</h2>
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/ai-intake/${s.id}`)}
              className="glass-card p-4 w-full text-left hover:border-indigo-400 transition-colors flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-white">{s.file.fileName}</p>
                <p className="text-sm text-gray-500">
                  {s.classification?.documentType ?? 'Processing'} · {format(new Date(s.createdAt), 'MMM d, h:mm a')}
                </p>
              </div>
              <span className={cn(
                'text-sm font-medium px-3 py-1 rounded-full capitalize shrink-0',
                s.status === 'awaiting_review' && 'bg-amber-100 text-amber-800',
                s.status === 'approved' && 'bg-blue-100 text-blue-800',
                s.status === 'automation_complete' && 'bg-emerald-100 text-emerald-800',
                s.status === 'failed' && 'bg-rose-100 text-rose-800',
              )}>
                {s.status.replace(/_/g, ' ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
