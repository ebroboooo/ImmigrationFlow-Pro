import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { DuplicateAction, ImportOptions, MigrationSession, MigrationWizardStep } from '../../domain/import/MigrationTypes';
import type { MigrationFieldKey } from '../../domain/import/MigrationTypes';
import { migrationWizardService } from '../../application/import/migrationWizardService';
import { migrationImportService } from '../../application/import/migrationImportService';

interface MigrationWizardContextValue {
  session: MigrationSession;
  processing: boolean;
  statusMessage: string;
  progressPercent: number;
  uploadSpreadsheets: (files: File[]) => Promise<void>;
  uploadZip: (file: File) => Promise<void>;
  runAnalysis: () => void;
  updateMapping: (spreadsheetId: string, sourceColumn: string, targetField: MigrationFieldKey) => void;
  buildPreview: () => Promise<void>;
  resolveDuplicate: (duplicateId: string, action: DuplicateAction) => void;
  setOptions: (options: Partial<ImportOptions>) => void;
  goToStep: (step: MigrationWizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  runImport: () => Promise<void>;
  downloadReport: () => void;
  resetWizard: () => void;
  cancelProcessing: () => void;
}

const MigrationWizardContext = createContext<MigrationWizardContextValue | null>(null);

const STEP_ORDER: MigrationWizardStep[] = [
  'upload_spreadsheets',
  'upload_documents',
  'analyze',
  'column_mapping',
  'preview',
  'duplicates',
  'options',
  'import',
  'report',
];

export function MigrationWizardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const abortRef = useRef<AbortController | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [session, setSession] = useState<MigrationSession>(() => {
    const saved = migrationWizardService.loadSession();
    if (saved) return saved;
    return migrationWizardService.createSession(user?.tenantId ?? 'demo', user?.id ?? 'user');
  });

  const patchSession = useCallback((next: MigrationSession) => {
    setSession(next);
    migrationWizardService.saveSession({
      ...next,
      zipDocuments: next.zipDocuments.map((z) => ({ ...z, blob: new Blob() })),
    });
  }, []);

  const uploadSpreadsheets = useCallback(async (files: File[]) => {
    abortRef.current = new AbortController();
    setProcessing(true);
    try {
      const next = await migrationWizardService.addSpreadsheetFiles(
        session,
        files,
        (msg, pct) => { setStatusMessage(msg); setProgressPercent(pct); },
        abortRef.current.signal,
      );
      patchSession({ ...next, currentStep: 'upload_documents' });
    } finally {
      setProcessing(false);
      setStatusMessage('');
    }
  }, [session, patchSession]);

  const uploadZip = useCallback(async (file: File) => {
    abortRef.current = new AbortController();
    setProcessing(true);
    try {
      const next = await migrationWizardService.addZipDocuments(
        session,
        file,
        (msg, pct) => { setStatusMessage(msg); setProgressPercent(pct); },
        abortRef.current.signal,
      );
      patchSession(next);
    } finally {
      setProcessing(false);
    }
  }, [session, patchSession]);

  const runAnalysis = useCallback(() => {
    patchSession(migrationWizardService.analyzeSpreadsheets(session));
  }, [session, patchSession]);

  const updateMapping = useCallback((spreadsheetId: string, sourceColumn: string, targetField: MigrationFieldKey) => {
    patchSession(migrationWizardService.updateColumnMapping(session, spreadsheetId, sourceColumn, targetField));
  }, [session, patchSession]);

  const buildPreview = useCallback(async () => {
    setProcessing(true);
    try {
      const next = await migrationWizardService.buildMigrationPreview(session);
      patchSession(next);
    } finally {
      setProcessing(false);
    }
  }, [session, patchSession]);

  const resolveDuplicate = useCallback((duplicateId: string, action: DuplicateAction) => {
    patchSession(migrationWizardService.resolveDuplicate(session, duplicateId, action));
  }, [session, patchSession]);

  const setOptions = useCallback((options: Partial<ImportOptions>) => {
    patchSession(migrationWizardService.setImportOptions(session, options));
  }, [session, patchSession]);

  const goToStep = useCallback((step: MigrationWizardStep) => {
    patchSession(migrationWizardService.goToStep(session, step));
  }, [session, patchSession]);

  const nextStep = useCallback(() => {
    const idx = STEP_ORDER.indexOf(session.currentStep);
    if (idx < STEP_ORDER.length - 1) {
      goToStep(STEP_ORDER[idx + 1]);
    }
  }, [session.currentStep, goToStep]);

  const prevStep = useCallback(() => {
    const idx = STEP_ORDER.indexOf(session.currentStep);
    if (idx > 0) goToStep(STEP_ORDER[idx - 1]);
  }, [session.currentStep, goToStep]);

  const runImport = useCallback(async () => {
    if (!session.preview) return;
    abortRef.current = new AbortController();
    setProcessing(true);
    patchSession({ ...session, currentStep: 'import', progress: { phase: 'preparing', processed: 0, total: 1, message: 'Starting…', percent: 0 } });
    try {
      const report = await migrationImportService.execute({
        tenantId: session.tenantId,
        userId: session.userId,
        preview: session.preview,
        options: session.importOptions,
        zipDocuments: session.zipDocuments,
        signal: abortRef.current.signal,
        onProgress: (p) => {
          patchSession({
            ...session,
            currentStep: 'import',
            progress: p,
          });
        },
      });
      patchSession({
        ...session,
        report,
        currentStep: 'report',
        progress: { phase: report.success ? 'complete' : 'failed', processed: 1, total: 1, message: report.success ? 'Complete' : 'Failed — rolled back', percent: 100 },
      });
    } finally {
      setProcessing(false);
    }
  }, [session, patchSession]);

  const downloadReport = useCallback(() => {
    if (session.report) migrationImportService.downloadReport(session.report);
  }, [session.report]);

  const resetWizard = useCallback(() => {
    migrationWizardService.clearSession();
    setSession(migrationWizardService.createSession(user?.tenantId ?? 'demo', user?.id ?? 'user'));
  }, [user]);

  const cancelProcessing = useCallback(() => {
    abortRef.current?.abort();
    setProcessing(false);
  }, []);

  const value = useMemo((): MigrationWizardContextValue => ({
    session,
    processing,
    statusMessage,
    progressPercent,
    uploadSpreadsheets,
    uploadZip,
    runAnalysis,
    updateMapping,
    buildPreview,
    resolveDuplicate,
    setOptions,
    goToStep,
    nextStep,
    prevStep,
    runImport,
    downloadReport,
    resetWizard,
    cancelProcessing,
  }), [session, processing, statusMessage, progressPercent, uploadSpreadsheets, uploadZip, runAnalysis, updateMapping, buildPreview, resolveDuplicate, setOptions, goToStep, nextStep, prevStep, runImport, downloadReport, resetWizard, cancelProcessing]);

  return (
    <MigrationWizardContext.Provider value={value}>{children}</MigrationWizardContext.Provider>
  );
}

export function useMigrationWizard() {
  const ctx = useContext(MigrationWizardContext);
  if (!ctx) throw new Error('useMigrationWizard must be used within MigrationWizardProvider');
  return ctx;
}
