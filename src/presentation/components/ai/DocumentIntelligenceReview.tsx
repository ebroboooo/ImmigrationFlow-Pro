import { useCallback } from 'react';
import type {
  DocumentIntelligenceResult,
  IntelligentFieldValue,
  PersonEntity,
  FieldReviewStatus,
} from '../../../domain/ai/DocumentIntelligence';
import { cn } from '../../../lib/utils';
import { design } from '../../../lib/design';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

interface DocumentIntelligenceReviewProps {
  intelligence: DocumentIntelligenceResult;
  onChange: (intelligence: DocumentIntelligenceResult) => void;
}

type ReviewSection = 'client' | 'case' | 'immigration' | 'contacts' | 'deadlines' | 'appointments' | 'documents' | 'warnings' | 'missing';

const SECTION_LABELS: Record<ReviewSection, string> = {
  client: 'Client',
  case: 'Case',
  immigration: 'Immigration',
  contacts: 'Contacts',
  deadlines: 'Deadlines',
  appointments: 'Appointments',
  documents: 'Documents',
  warnings: 'Warnings',
  missing: 'Missing Information',
};

function confidenceBadge(confidence: number): string {
  if (confidence >= 0.85) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
  if (confidence >= 0.6) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
  return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
}

function validationIcon(status?: IntelligentFieldValue['validation']) {
  if (!status || status.status === 'unverified') return null;
  if (status.status === 'valid') return <Check className="w-4 h-4 text-emerald-500" />;
  if (status.status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <X className="w-4 h-4 text-rose-500" />;
}

interface FieldRowProps {
  label: string;
  fieldKey: string;
  field?: IntelligentFieldValue | null;
  onUpdate: (key: string, value: IntelligentFieldValue | null) => void;
}

function FieldRow({ label, fieldKey, field, onUpdate }: FieldRowProps) {
  if (!field) return null;

  const setReview = (reviewStatus: FieldReviewStatus) => {
    onUpdate(fieldKey, { ...field, reviewStatus });
  };

  const setValue = (value: string) => {
    onUpdate(fieldKey, { ...field, value, confidence: 1, extractionMethod: 'manual', reviewStatus: 'pending' });
  };

  return (
    <div className={cn(
      'p-3 rounded-xl border space-y-2',
      field.reviewStatus === 'approved' && 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20',
      field.reviewStatus === 'rejected' && 'border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 opacity-60',
      !field.reviewStatus || field.reviewStatus === 'pending' ? 'border-gray-200 dark:border-gray-800' : '',
    )}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex items-center gap-2">
          {validationIcon(field.validation)}
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', confidenceBadge(field.confidence))}>
            {Math.round(field.confidence * 100)}%
          </span>
          <span className="text-xs text-gray-400">{field.extractionMethod}</span>
        </div>
      </div>
      <input
        type="text"
        value={field.value}
        onChange={(e) => setValue(e.target.value)}
        className={design.input}
      />
      {field.sourceSnippet && (
        <p className="text-xs text-gray-500 italic truncate" title={field.sourceSnippet}>
          Source: &ldquo;{field.sourceSnippet}&rdquo;
        </p>
      )}
      {field.validation?.message && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{field.validation.message}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setReview('approved')}
          className={cn('text-xs px-3 py-1 rounded-lg border', field.reviewStatus === 'approved' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 dark:border-gray-700')}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setReview('rejected')}
          className={cn('text-xs px-3 py-1 rounded-lg border', field.reviewStatus === 'rejected' ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-300 dark:border-gray-700')}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function PersonCard({
  person,
  onChange,
}: {
  person: PersonEntity;
  onChange: (person: PersonEntity) => void;
}) {
  const updatePersonField = (key: keyof PersonEntity, field: IntelligentFieldValue | null) => {
    onChange({ ...person, [key]: field ?? undefined });
  };

  const fields: [string, IntelligentFieldValue | undefined][] = [
    ['Name', person.name],
    ['Date of Birth', person.dateOfBirth],
    ['Nationality', person.nationality],
    ['Phone', person.phone],
    ['Email', person.email],
    ['Address', person.address],
    ['Relationship', person.relationship],
  ];

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-white">{person.role}</h4>
        <span className={cn('text-xs px-2 py-0.5 rounded-full', confidenceBadge(person.confidence))}>
          {Math.round(person.confidence * 100)}%
        </span>
      </div>
      {fields.map(([label, field]) =>
        field ? (
          <FieldRow
            key={label}
            label={label}
            fieldKey={`person-${person.id}-${label}`}
            field={field}
            onUpdate={(_, updated) => updatePersonField(label === 'Name' ? 'name' : label === 'Date of Birth' ? 'dateOfBirth' : label.toLowerCase() as keyof PersonEntity, updated)}
          />
        ) : null,
      )}
    </div>
  );
}

export function DocumentIntelligenceReview({ intelligence, onChange }: DocumentIntelligenceReviewProps) {
  const updateSchemaField = useCallback((key: string, field: IntelligentFieldValue | null) => {
    onChange({
      ...intelligence,
      schemaExtraction: {
        ...intelligence.schemaExtraction,
        fields: { ...intelligence.schemaExtraction.fields, [key]: field },
      },
    });
  }, [intelligence, onChange]);

  const updateCaseField = useCallback((key: keyof DocumentIntelligenceResult['caseEntity'], field: IntelligentFieldValue | undefined) => {
    onChange({
      ...intelligence,
      caseEntity: { ...intelligence.caseEntity, [key]: field },
    });
  }, [intelligence, onChange]);

  const updatePerson = useCallback((index: number, person: PersonEntity) => {
    const persons = [...intelligence.persons];
    persons[index] = person;
    onChange({ ...intelligence, persons });
  }, [intelligence, onChange]);

  const schemaFields = intelligence.schemaExtraction.fields;
  const caseEntity = intelligence.caseEntity;

  const immigrationKeys = ['formNumber', 'caseType', 'receiptNumber', 'aNumber', 'priorityDate', 'serviceCenter', 'uscisOffice', 'visaCategory', 'caseCategory'];
  const contactKeys = ['attorney', 'petitioner', 'beneficiary', 'mailingAddress', 'onlineAccountNumber'];

  const renderSection = (section: ReviewSection) => {
    switch (section) {
      case 'client':
        return intelligence.persons.length > 0 ? (
          intelligence.persons.map((p, i) => (
            <PersonCard key={p.id} person={p} onChange={(updated) => updatePerson(i, updated)} />
          ))
        ) : (
          <p className="text-sm text-gray-500">No persons extracted.</p>
        );

      case 'case':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['receiptNumber', 'aNumber', 'caseNumber', 'uscisOnlineAccountNumber', 'priorityDate', 'currentStatus', 'serviceCenter', 'office'] as const).map((key) => {
              const field = caseEntity[key];
              if (!field || Array.isArray(field)) return null;
              return (
                <FieldRow
                  key={key}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  fieldKey={key}
                  field={field}
                  onUpdate={(_, updated) => updateCaseField(key, updated ?? undefined)}
                />
              );
            })}
          </div>
        );

      case 'immigration':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {immigrationKeys.map((key) => {
              const field = schemaFields[key] ?? (key === 'receiptNumber' ? caseEntity.receiptNumber : key === 'aNumber' ? caseEntity.aNumber : null);
              return field ? (
                <FieldRow key={key} label={key} fieldKey={key} field={field} onUpdate={updateSchemaField} />
              ) : null;
            })}
            <div className="sm:col-span-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
              <p className="text-sm font-medium">{intelligence.detection.documentType}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{intelligence.detection.reason}</p>
              <p className="text-xs text-gray-500 mt-1">Detection confidence: {Math.round(intelligence.detection.confidence * 100)}%</p>
            </div>
          </div>
        );

      case 'contacts':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contactKeys.map((key) => {
              const field = schemaFields[key];
              return field ? <FieldRow key={key} label={key} fieldKey={key} field={field} onUpdate={updateSchemaField} /> : null;
            })}
          </div>
        );

      case 'deadlines':
        return (
          <div className="space-y-2">
            {(caseEntity.deadlines ?? []).map((d, i) => (
              <FieldRow key={i} label={`Deadline ${i + 1}`} fieldKey={`deadline-${i}`} field={d} onUpdate={() => {}} />
            ))}
            {schemaFields.deadlines && (
              <FieldRow label="Deadlines (document)" fieldKey="deadlines" field={schemaFields.deadlines} onUpdate={updateSchemaField} />
            )}
            {(caseEntity.deadlines ?? []).length === 0 && !schemaFields.deadlines && (
              <p className="text-sm text-gray-500">No deadlines extracted.</p>
            )}
          </div>
        );

      case 'appointments':
        return (
          <div className="space-y-2">
            {[...(caseEntity.interviewDates ?? []), ...(caseEntity.biometricsDates ?? [])].map((d, i) => (
              <FieldRow key={i} label={`Appointment ${i + 1}`} fieldKey={`appt-${i}`} field={d} onUpdate={() => {}} />
            ))}
            {schemaFields.appointmentData && (
              <FieldRow label="Appointment Data" fieldKey="appointmentData" field={schemaFields.appointmentData} onUpdate={updateSchemaField} />
            )}
            {[...(caseEntity.interviewDates ?? []), ...(caseEntity.biometricsDates ?? [])].length === 0 && !schemaFields.appointmentData && (
              <p className="text-sm text-gray-500">No appointments extracted.</p>
            )}
          </div>
        );

      case 'documents':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(schemaFields)
              .filter(([key]) => !immigrationKeys.includes(key) && !contactKeys.includes(key))
              .map(([key, field]) =>
                field ? <FieldRow key={key} label={key} fieldKey={key} field={field} onUpdate={updateSchemaField} /> : null,
              )}
          </div>
        );

      case 'warnings':
        return intelligence.warnings.length > 0 ? (
          <ul className="space-y-2">
            {intelligence.warnings.map((w, i) => (
              <li key={i} className={cn(
                'flex items-start gap-2 p-3 rounded-xl text-sm',
                w.severity === 'error' && 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
                w.severity === 'warning' && 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
                w.severity === 'info' && 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
              )}>
                {w.severity === 'error' ? <X className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
                {w.field && <strong className="mr-1">{w.field}:</strong>}{w.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No validation warnings.</p>
        );

      case 'missing':
        return (
          <div className="space-y-3">
            {intelligence.missingInformation.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {intelligence.missingInformation.map((m) => <li key={m}>{m}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No missing required fields detected.</p>
            )}
            {intelligence.smartRecommendations.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Smart Recommendations</h4>
                {intelligence.smartRecommendations.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const crm = intelligence.crmMatching;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-base text-gray-600 dark:text-gray-400">
          Overall confidence: <strong>{Math.round(intelligence.overallConfidence * 100)}%</strong>
        </p>
        {intelligence.promptVersion && (
          <span className="text-xs text-gray-400">Prompt v{intelligence.promptVersion}</span>
        )}
      </div>

      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
        <h4 className="font-medium text-indigo-900 dark:text-indigo-200">CRM Match Suggestion</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>{crm.action.replace(/_/g, ' ')}</strong> — {crm.reason}
        </p>
        {crm.candidates.length > 0 && (
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {crm.candidates.map((c) => (
              <li key={`${c.entityType}-${c.entityId}`}>
                {c.entityType}: {c.entityName} ({Math.round(c.similarity * 100)}% — {c.matchedOn.join(', ')})
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-500">Never auto-overwrites CRM data.</p>
      </div>

      {(Object.keys(SECTION_LABELS) as ReviewSection[]).map((section) => (
        <div key={section} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
            {SECTION_LABELS[section]}
          </h3>
          {renderSection(section)}
        </div>
      ))}
    </div>
  );
}
