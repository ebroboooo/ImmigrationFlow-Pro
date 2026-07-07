import { useRef } from 'react';
import {
  Upload, FileArchive, Sparkles, Columns3, Eye, Copy, Settings2, Play, FileCheck,
  ChevronRight, ChevronLeft, Download, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useMigrationWizard } from '../contexts/MigrationWizardContext';
import { MIGRATION_STEP_LABELS, MIGRATION_WIZARD_STEPS } from '../../domain/import/MigrationTypes';
import type { MigrationFieldKey, MigrationWizardStep } from '../../domain/import/MigrationTypes';
import { cn } from '../../lib/utils';
import { design } from '../../lib/design';

const FIELD_OPTIONS: MigrationFieldKey[] = [
  'clientName', 'beneficiary', 'petitioner', 'attorney', 'email', 'phone',
  'receiptNumber', 'caseNumber', 'aNumber', 'priorityDate', 'interviewDate',
  'biometricsDate', 'filingDate', 'status', 'caseType', 'visaCategory', 'country',
  'address', 'notes', 'invoiceAmount', 'balance', 'payment', 'appointmentDate',
  'deadlineDate', 'taskTitle', 'documentName', 'leadName', 'company', 'ignore', 'unknown',
];

const STEP_ICONS: Record<MigrationWizardStep, typeof Upload> = {
  upload_spreadsheets: Upload,
  upload_documents: FileArchive,
  analyze: Sparkles,
  column_mapping: Columns3,
  preview: Eye,
  duplicates: Copy,
  options: Settings2,
  import: Play,
  report: FileCheck,
};

function StepIndicator({ current }: { current: MigrationWizardStep }) {
  const idx = MIGRATION_WIZARD_STEPS.indexOf(current);
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {MIGRATION_WIZARD_STEPS.map((step, i) => {
        const Icon = STEP_ICONS[step];
        const active = step === current;
        const done = i < idx;
        return (
          <div
            key={step}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium min-h-11',
              active && 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500',
              done && !active && 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
              !active && !done && 'bg-gray-100 dark:bg-gray-900 text-gray-500',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{MIGRATION_STEP_LABELS[step]}</span>
            <span className="sm:hidden">{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function UploadSpreadsheetsStep() {
  const { uploadSpreadsheets, processing, statusMessage, progressPercent, session, nextStep } = useMigrationWizard();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="glass-card p-8 space-y-6 max-w-2xl mx-auto text-center">
      <Upload className="w-16 h-16 mx-auto text-indigo-500" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Your Spreadsheets</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Upload Excel (.xlsx), CSV, TSV, or Google Sheets exports. You can upload multiple files at once.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) void uploadSpreadsheets(files);
        }}
      />
      <button
        type="button"
        disabled={processing}
        onClick={() => inputRef.current?.click()}
        className={cn(design.btn.primary, 'w-full sm:w-auto text-lg min-h-14 px-10')}
      >
        Choose Spreadsheet Files
      </button>
      {processing && (
        <p className="text-base text-indigo-600">{statusMessage} ({progressPercent}%)</p>
      )}
      {session.spreadsheets.length > 0 && (
        <div className="text-left space-y-2 pt-4">
          <p className="font-semibold text-gray-900 dark:text-white">{session.spreadsheets.length} sheet(s) loaded</p>
          <ul className="text-base text-gray-600 dark:text-gray-400 space-y-1">
            {session.spreadsheets.map((s) => (
              <li key={s.id}>{s.fileName} — {s.sheetName} ({s.rowCount} rows)</li>
            ))}
          </ul>
          <button type="button" onClick={nextStep} className={cn(design.btn.primary, 'mt-4 w-full sm:w-auto')}>
            Continue <ChevronRight className="w-5 h-5 inline" />
          </button>
        </div>
      )}
    </div>
  );
}

function UploadDocumentsStep() {
  const { uploadZip, processing, session, nextStep, prevStep } = useMigrationWizard();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="glass-card p-8 space-y-6 max-w-2xl mx-auto text-center">
      <FileArchive className="w-16 h-16 mx-auto text-indigo-500" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Documents (Optional)</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Upload a ZIP file containing client documents. AI will link them to the correct clients and cases.
      </p>
      <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void uploadZip(f);
      }} />
      <button type="button" disabled={processing} onClick={() => inputRef.current?.click()} className={cn(design.btn.secondary, 'text-lg min-h-14 px-10')}>
        Choose ZIP File
      </button>
      {session.zipDocuments.length > 0 && (
        <p className="text-base text-emerald-600">{session.zipDocuments.length} documents extracted from ZIP</p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button type="button" onClick={prevStep} className={cn(design.btn.secondary, 'min-h-12')}><ChevronLeft className="w-5 h-5" /> Back</button>
        <button type="button" onClick={nextStep} className={cn(design.btn.primary, 'min-h-12')}>Continue <ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function AnalyzeStep() {
  const { runAnalysis, buildPreview, processing, session, prevStep, nextStep } = useMigrationWizard();

  const handleAnalyze = () => {
    runAnalysis();
    nextStep();
  };

  return (
    <div className="glass-card p-8 space-y-6 max-w-2xl mx-auto text-center">
      <Sparkles className="w-16 h-16 mx-auto text-indigo-500" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Spreadsheet Analysis</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        AI will analyze {session.spreadsheets.reduce((n, s) => n + s.rowCount, 0)} rows across {session.spreadsheets.length} sheet(s) and detect column mappings automatically.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button type="button" onClick={prevStep} className={cn(design.btn.secondary, 'min-h-12')}><ChevronLeft className="w-5 h-5" /> Back</button>
        <button type="button" onClick={handleAnalyze} className={cn(design.btn.primary, 'min-h-14 text-lg px-8')}>
          Run AI Analysis
        </button>
      </div>
      {session.analysisComplete && (
        <button type="button" disabled={processing} onClick={() => void buildPreview()} className={cn(design.btn.primary, 'min-h-12')}>
          {processing ? 'Building preview…' : 'Build Preview & Continue'}
        </button>
      )}
    </div>
  );
}

function ColumnMappingStep() {
  const { session, updateMapping, buildPreview, processing, prevStep } = useMigrationWizard();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Column Mapping</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400">Review AI-detected column mappings. Adjust any mapping before import.</p>
      {session.columnMappings.map((cm) => (
        <div key={cm.spreadsheetId} className="glass-card p-5 space-y-4">
          <h3 className="text-lg font-semibold">{cm.sheetName}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-3 pr-4">Source Column</th>
                  <th className="py-3 pr-4">Maps To</th>
                  <th className="py-3 pr-4">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {cm.mappings.map((m) => (
                  <tr key={m.sourceColumn} className="border-b border-gray-100 dark:border-gray-900">
                    <td className="py-3 pr-4 font-medium">{m.sourceColumn}</td>
                    <td className="py-3 pr-4">
                      <select
                        value={m.targetField}
                        onChange={(e) => updateMapping(cm.spreadsheetId, m.sourceColumn, e.target.value as MigrationFieldKey)}
                        className={cn(design.input, 'min-w-[180px]')}
                      >
                        {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-sm font-medium',
                        m.confidence >= 0.85 ? 'bg-emerald-100 text-emerald-800' : m.confidence >= 0.6 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800',
                      )}>
                        {Math.round(m.confidence * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <div className="flex gap-3">
        <button type="button" onClick={prevStep} className={cn(design.btn.secondary, 'min-h-12')}><ChevronLeft className="w-5 h-5" /> Back</button>
        <button type="button" disabled={processing} onClick={() => void buildPreview()} className={cn(design.btn.primary, 'min-h-14 text-lg flex-1 sm:flex-none')}>
          {processing ? 'Building preview…' : 'Preview Import Data'}
        </button>
      </div>
    </div>
  );
}

function PreviewStep() {
  const { session, prevStep, nextStep } = useMigrationWizard();
  const p = session.preview;
  if (!p) return null;

  const stats = [
    { label: 'Clients', count: p.clients.length },
    { label: 'Leads', count: p.leads.length },
    { label: 'Cases', count: p.cases.length },
    { label: 'Tasks', count: p.tasks.length },
    { label: 'Deadlines', count: p.deadlines.length },
    { label: 'Appointments', count: p.appointments.length },
    { label: 'Invoices', count: p.invoices.length },
    { label: 'Documents', count: p.documents.length },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Preview Import Data</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Nothing will be written until you approve. Estimated time: ~{p.estimatedSeconds}s
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-indigo-600">{s.count}</div>
            <div className="text-base text-gray-600 dark:text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>
      {(p.errors.length > 0 || p.warnings.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {p.errors.length > 0 && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4 space-y-2">
              <h3 className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2"><XCircle className="w-5 h-5" /> Errors ({p.errors.length})</h3>
              {p.errors.slice(0, 5).map((e, i) => <p key={i} className="text-sm text-rose-700">{e.message}</p>)}
            </div>
          )}
          {p.warnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Warnings ({p.warnings.length})</h3>
              {p.warnings.slice(0, 5).map((w, i) => <p key={i} className="text-sm text-amber-700">{w.message}</p>)}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={prevStep} className={cn(design.btn.secondary, 'min-h-12')}><ChevronLeft className="w-5 h-5" /> Back</button>
        <button type="button" onClick={nextStep} className={cn(design.btn.primary, 'min-h-14 text-lg flex-1 sm:flex-none')}>Review Duplicates <ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function DuplicatesStep() {
  const { session, resolveDuplicate, prevStep, nextStep } = useMigrationWizard();
  const dups = session.preview?.duplicates ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resolve Duplicates</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400">Choose how to handle potential duplicates. Nothing is overwritten automatically.</p>
      {dups.length === 0 ? (
        <p className="text-base text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> No duplicates detected.</p>
      ) : (
        <div className="space-y-3">
          {dups.map((d) => (
            <div key={d.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{d.previewLabel} ({d.entityType})</p>
                <p className="text-sm text-gray-500">Matched: {d.matchedOn.join(', ')} — {Math.round(d.similarity * 100)}%</p>
                {d.existingLabel && <p className="text-sm text-gray-500">Existing: {d.existingLabel}</p>}
              </div>
              <select
                value={d.resolvedAction ?? d.suggestedAction}
                onChange={(e) => resolveDuplicate(d.id, e.target.value as typeof d.suggestedAction)}
                className={cn(design.input, 'min-w-[160px]')}
              >
                <option value="create_new">Create New</option>
                <option value="update_existing">Update Existing</option>
                <option value="merge">Merge</option>
                <option value="skip">Skip</option>
              </select>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={prevStep} className={cn(design.btn.secondary, 'min-h-12')}><ChevronLeft className="w-5 h-5" /> Back</button>
        <button type="button" onClick={nextStep} className={cn(design.btn.primary, 'min-h-14 text-lg')}>Import Options <ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function OptionsStep() {
  const { session, setOptions, prevStep, runImport, processing } = useMigrationWizard();
  const opts = session.importOptions;

  const toggle = (key: keyof typeof opts) => setOptions({ [key]: !opts[key] });

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Import Options</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400">Select which record types to create in your CRM.</p>
      <div className="glass-card p-5 space-y-3">
        {([
          ['createClients', 'Create Clients'],
          ['createLeads', 'Create Leads'],
          ['createCases', 'Create Cases'],
          ['createTasks', 'Create Tasks'],
          ['createDeadlines', 'Create Deadlines'],
          ['createAppointments', 'Create Appointments'],
          ['createInvoices', 'Create Billing Records'],
          ['createDocuments', 'Link Documents'],
          ['createNotes', 'Create Notes'],
          ['createActivities', 'Log Import Activity'],
          ['skipDuplicates', 'Skip Duplicates'],
          ['updateExisting', 'Update Existing Records'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 min-h-12 cursor-pointer">
            <input type="checkbox" checked={opts[key]} onChange={() => toggle(key)} className="w-5 h-5" />
            <span className="text-base text-gray-900 dark:text-white">{label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={prevStep} className={cn(design.btn.secondary, 'min-h-12')}><ChevronLeft className="w-5 h-5" /> Back</button>
        <button type="button" disabled={processing} onClick={() => void runImport()} className={cn(design.btn.primary, 'min-h-14 text-lg flex-1')}>
          <Play className="w-5 h-5" /> Run Migration
        </button>
      </div>
    </div>
  );
}

function ImportProgressStep() {
  const { session, cancelProcessing, processing } = useMigrationWizard();
  const p = session.progress;

  return (
    <div className="glass-card p-8 space-y-6 max-w-2xl mx-auto text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Running Migration…</h2>
      {p && (
        <>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${p.percent}%` }} />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">{p.message} ({p.percent}%)</p>
        </>
      )}
      {processing && (
        <button type="button" onClick={cancelProcessing} className={cn(design.btn.secondary, 'text-rose-600 min-h-12')}>Cancel Import</button>
      )}
    </div>
  );
}

function ReportStep() {
  const { session, downloadReport, resetWizard } = useMigrationWizard();
  const r = session.report;
  if (!r) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="glass-card p-8 text-center space-y-4">
        {r.success ? (
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
        ) : (
          <XCircle className="w-16 h-16 mx-auto text-rose-500" />
        )}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {r.success ? 'Migration Complete' : 'Migration Failed'}
        </h2>
        {r.rollbackPerformed && (
          <p className="text-base text-amber-600">All changes were rolled back. Your CRM data is unchanged.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div><div className="text-2xl font-bold text-emerald-600">{r.imported}</div><div className="text-sm">Imported</div></div>
          <div><div className="text-2xl font-bold text-gray-500">{r.skipped}</div><div className="text-sm">Skipped</div></div>
          <div><div className="text-2xl font-bold text-blue-600">{r.updated}</div><div className="text-sm">Updated</div></div>
          <div><div className="text-2xl font-bold text-rose-600">{r.errors}</div><div className="text-sm">Errors</div></div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button type="button" onClick={downloadReport} className={cn(design.btn.secondary, 'min-h-12')}><Download className="w-5 h-5" /> Download JSON Report</button>
        <button type="button" onClick={resetWizard} className={cn(design.btn.primary, 'min-h-12')}>Start New Migration</button>
      </div>
    </div>
  );
}

export function MigrationWizard() {
  const { session } = useMigrationWizard();

  const renderStep = () => {
    switch (session.currentStep) {
      case 'upload_spreadsheets': return <UploadSpreadsheetsStep />;
      case 'upload_documents': return <UploadDocumentsStep />;
      case 'analyze': return <AnalyzeStep />;
      case 'column_mapping': return <ColumnMappingStep />;
      case 'preview': return <PreviewStep />;
      case 'duplicates': return <DuplicatesStep />;
      case 'options': return <OptionsStep />;
      case 'import': return <ImportProgressStep />;
      case 'report': return <ReportStep />;
      default: return null;
    }
  };

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 py-6 pb-24">
      <PageHeader
        title="Migration Wizard"
        description="Import your entire immigration practice from spreadsheets in minutes — powered by AI."
      />
      <StepIndicator current={session.currentStep} />
      {renderStep()}
    </div>
  );
}
