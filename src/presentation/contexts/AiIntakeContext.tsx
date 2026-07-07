import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { IntakeSession } from '../../domain/ai/IntakeSession';
import { useAuth } from './AuthContext';
import { useRepositories } from './RepositoryContext';
import { intakePipelineService } from '../../application/ai/intakePipelineService';
import { automationExecutionService } from '../../application/ai/automationExecutionService';
import { intakeSessionStorage } from '../../infrastructure/ai/storage/intakeSessionStorage';
import { getLLMProviderStatus } from '../../infrastructure/ai/providers/llmProviderRegistry';
import { ocrProviderManager } from '../../infrastructure/ai/ocr/ocrProviderManager';

interface AiIntakeContextValue {
  sessions: IntakeSession[];
  activeSession: IntakeSession | null;
  processing: boolean;
  llmStatus: ReturnType<typeof getLLMProviderStatus>;
  ocrConfigured: boolean;
  ocrStatus: ReturnType<typeof ocrProviderManager.getProviderStatus>;
  refresh: () => void;
  uploadAndAnalyze: (file: File) => Promise<IntakeSession>;
  cancelProcessing: () => void;
  selectSession: (id: string | null) => void;
  updateSession: (session: IntakeSession) => void;
  approve: (session: IntakeSession) => Promise<IntakeSession>;
  reject: (session: IntakeSession) => Promise<IntakeSession>;
  runAutomation: (session: IntakeSession) => Promise<IntakeSession>;
}

const AiIntakeContext = createContext<AiIntakeContextValue | null>(null);

export function AiIntakeProvider({ children }: { children: ReactNode }) {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const [sessions, setSessions] = useState<IntakeSession[]>(() => intakeSessionStorage.getAll(tenantId));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    setSessions(intakeSessionStorage.getAll(tenantId));
  }, [tenantId]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  const cancelProcessing = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const uploadAndAnalyze = useCallback(async (file: File) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setProcessing(true);
    try {
      const session = await intakePipelineService.createSession(file, tenantId, user?.id, {
        signal: ac.signal,
        onSessionUpdate: (updated) => {
          setSessions((prev) => {
            const idx = prev.findIndex((s) => s.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev];
          });
          setActiveId(updated.id);
        },
      });
      refresh();
      setActiveId(session.id);
      return session;
    } finally {
      setProcessing(false);
      abortRef.current = null;
    }
  }, [tenantId, user?.id, refresh]);

  const updateSession = useCallback((session: IntakeSession) => {
    intakePipelineService.saveReviewedSession(session, user?.id ?? '');
    refresh();
  }, [user?.id, refresh]);

  const approve = useCallback(async (session: IntakeSession) => {
    const approved = intakePipelineService.approveSession(session, user?.id ?? '');
    refresh();
    return approved;
  }, [user?.id, refresh]);

  const reject = useCallback(async (session: IntakeSession) => {
    const rejected = intakePipelineService.rejectSession(session, user?.id ?? '');
    refresh();
    return rejected;
  }, [user?.id, refresh]);

  const runAutomation = useCallback(async (session: IntakeSession) => {
    setProcessing(true);
    try {
      await automationExecutionService.execute(session, repos, tenantId, user?.id ?? '');
      refresh();
      return intakeSessionStorage.getById(tenantId, session.id)!;
    } finally {
      setProcessing(false);
    }
  }, [repos, tenantId, user?.id, refresh]);

  const value = useMemo((): AiIntakeContextValue => ({
    sessions,
    activeSession,
    processing,
    llmStatus: getLLMProviderStatus(),
    ocrConfigured: ocrProviderManager.isOcrConfigured(),
    ocrStatus: ocrProviderManager.getProviderStatus(),
    refresh,
    uploadAndAnalyze,
    cancelProcessing,
    selectSession: setActiveId,
    updateSession,
    approve,
    reject,
    runAutomation,
  }), [sessions, activeSession, processing, refresh, uploadAndAnalyze, cancelProcessing, updateSession, approve, reject, runAutomation]);

  return <AiIntakeContext.Provider value={value}>{children}</AiIntakeContext.Provider>;
}

export function useAiIntake() {
  const ctx = useContext(AiIntakeContext);
  if (!ctx) throw new Error('useAiIntake must be used within AiIntakeProvider');
  return ctx;
}
