import { generateId } from '../../lib/utils';
import type {
  MigrationSession,
  MigrationWizardStep,
  SpreadsheetColumnMapping,
} from '../../domain/import/MigrationTypes';
import { DEFAULT_IMPORT_OPTIONS } from '../../domain/import/MigrationTypes';
import { getImportSourceProvider } from '../../infrastructure/import/importSourceRegistry';
import { mapSpreadsheetColumns } from '../../infrastructure/import/mapping/columnMappingEngine';
import { zipDocumentArchiveProvider } from '../../infrastructure/import/providers/zipDocumentArchiveProvider';
import { buildPreviewFromSpreadsheets } from './migrationEntityBuilder';
import { validateMigrationPreview } from '../../infrastructure/import/validation/migrationValidationService';
import { detectMigrationDuplicates, applyDuplicateResolutions } from '../../infrastructure/import/duplicate/migrationDuplicateEngine';
import { linkDocumentsToEntities, buildPreviewDocumentsFromZip } from '../../infrastructure/import/documents/documentLinkingEngine';
import { mockRepositories } from '../../infrastructure/repositories/MockRepositoryFactory';

const SESSION_KEY = 'immflow_migration_session';

export function createMigrationSession(tenantId: string, userId: string): MigrationSession {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    tenantId,
    userId,
    currentStep: 'upload_spreadsheets',
    spreadsheets: [],
    zipDocuments: [],
    columnMappings: [],
    analysisComplete: false,
    preview: null,
    importOptions: { ...DEFAULT_IMPORT_OPTIONS },
    progress: null,
    report: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function saveMigrationSession(session: MigrationSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadMigrationSession(): MigrationSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MigrationSession;
  } catch {
    return null;
  }
}

export function clearMigrationSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function addSpreadsheetFiles(
  session: MigrationSession,
  files: File[],
  onProgress?: (msg: string, pct: number) => void,
  signal?: AbortSignal,
): Promise<MigrationSession> {
  const spreadsheets = [...session.spreadsheets];
  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) throw new Error('Upload cancelled.');
    const file = files[i];
    const provider = getImportSourceProvider(file.name, file.type);
    if (!provider) throw new Error(`Unsupported file: ${file.name}`);
    const parsed = await provider.parse(file, file.name, {
      signal,
      onProgress: (msg, pct) => onProgress?.(msg, Math.round(((i + pct / 100) / files.length) * 100)),
    });
    spreadsheets.push(...parsed);
  }
  return { ...session, spreadsheets, updatedAt: new Date().toISOString() };
}

export async function addZipDocuments(
  session: MigrationSession,
  file: File,
  onProgress?: (msg: string, pct: number) => void,
  signal?: AbortSignal,
): Promise<MigrationSession> {
  if (!zipDocumentArchiveProvider.canParse(file.name)) {
    throw new Error('Please upload a ZIP file.');
  }
  const entries = await zipDocumentArchiveProvider.extract(file, file.name, { signal, onProgress });
  const preview = session.preview ?? buildPreviewFromSpreadsheets(session.spreadsheets, session.columnMappings);
  const linked = linkDocumentsToEntities(entries, preview);
  return { ...session, zipDocuments: linked, updatedAt: new Date().toISOString() };
}

export function analyzeSpreadsheets(session: MigrationSession): MigrationSession {
  const columnMappings: SpreadsheetColumnMapping[] = session.spreadsheets.map((sheet) => ({
    spreadsheetId: sheet.id,
    sheetName: sheet.sheetName,
    mappings: mapSpreadsheetColumns(sheet.headers),
  }));
  return {
    ...session,
    columnMappings,
    analysisComplete: true,
    currentStep: 'column_mapping',
    updatedAt: new Date().toISOString(),
  };
}

export function updateColumnMapping(
  session: MigrationSession,
  spreadsheetId: string,
  sourceColumn: string,
  targetField: SpreadsheetColumnMapping['mappings'][0]['targetField'],
): MigrationSession {
  const columnMappings = session.columnMappings.map((cm) => {
    if (cm.spreadsheetId !== spreadsheetId) return cm;
    return {
      ...cm,
      mappings: cm.mappings.map((m) =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField, manualOverride: true, confidence: 1, reason: 'Manually corrected' }
          : m,
      ),
    };
  });
  return { ...session, columnMappings, updatedAt: new Date().toISOString() };
}

export async function buildMigrationPreview(session: MigrationSession): Promise<MigrationSession> {
  let preview = buildPreviewFromSpreadsheets(session.spreadsheets, session.columnMappings);
  if (session.zipDocuments.length > 0) {
    preview = buildPreviewDocumentsFromZip(session.zipDocuments, preview);
  }

  const { warnings, errors } = validateMigrationPreview(preview);
  preview = { ...preview, warnings, errors };

  const existingClients = await mockRepositories.clients.getAll(session.tenantId);
  const existingCases = await mockRepositories.cases.getAll(session.tenantId);
  const existingLeads = await mockRepositories.leads.getAll(session.tenantId);

  const duplicates = detectMigrationDuplicates({
    preview,
    existingClients,
    existingCases,
    existingLeads: existingLeads.map((l) => ({ id: l.id, name: l.name, email: l.email, phone: l.phone })),
  });

  preview = applyDuplicateResolutions(preview, duplicates);
  preview.duplicates = duplicates;

  return {
    ...session,
    preview,
    currentStep: 'preview',
    updatedAt: new Date().toISOString(),
  };
}

export function resolveDuplicate(
  session: MigrationSession,
  duplicateId: string,
  action: import('../../domain/import/MigrationTypes').DuplicateAction,
): MigrationSession {
  if (!session.preview) return session;
  const duplicates = session.preview.duplicates.map((d) =>
    d.id === duplicateId ? { ...d, resolvedAction: action } : d,
  );
  const preview = applyDuplicateResolutions({ ...session.preview, duplicates }, duplicates);
  return { ...session, preview, updatedAt: new Date().toISOString() };
}

export function setImportOptions(session: MigrationSession, options: Partial<MigrationSession['importOptions']>): MigrationSession {
  return {
    ...session,
    importOptions: { ...session.importOptions, ...options },
    updatedAt: new Date().toISOString(),
  };
}

export function goToStep(session: MigrationSession, step: MigrationWizardStep): MigrationSession {
  return { ...session, currentStep: step, updatedAt: new Date().toISOString() };
}

export const migrationWizardService = {
  createSession: createMigrationSession,
  saveSession: saveMigrationSession,
  loadSession: loadMigrationSession,
  clearSession: clearMigrationSession,
  addSpreadsheetFiles,
  addZipDocuments,
  analyzeSpreadsheets,
  updateColumnMapping,
  buildMigrationPreview,
  resolveDuplicate,
  setImportOptions,
  goToStep,
};
