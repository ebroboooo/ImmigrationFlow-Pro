import type { ExtractedImmigrationFields, FieldValue } from '../../../domain/ai/ExtractedFields';
import { design } from '../../../lib/design';

const FIELD_LABELS: Record<string, string> = {
  clientName: 'Client Name',
  beneficiary: 'Beneficiary',
  petitioner: 'Petitioner',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  receiptNumber: 'Receipt Number',
  aNumber: 'A-Number',
  uscisForm: 'USCIS Form',
  caseType: 'Case Type',
  noticeType: 'Notice Type',
  priority: 'Priority',
  office: 'USCIS Office',
  attorney: 'Attorney',
  filingDate: 'Filing Date',
  noticeDate: 'Notice Date',
  appointmentDate: 'Appointment Date',
  interviewDate: 'Interview Date',
  biometricsDate: 'Biometrics Date',
};

interface ExtractedFieldsFormProps {
  fields: ExtractedImmigrationFields;
  onChange: (fields: ExtractedImmigrationFields) => void;
}

function isFieldValue(v: unknown): v is FieldValue {
  return !!v && typeof v === 'object' && 'value' in v && 'confidence' in v;
}

export function ExtractedFieldsForm({ fields, onChange }: ExtractedFieldsFormProps) {
  const updateField = (key: string, value: string) => {
    onChange({
      ...fields,
      [key]: { value, confidence: 1, source: 'manual' as const },
    });
  };

  const entries = Object.entries(fields).filter(([key, val]) => isFieldValue(val) && FIELD_LABELS[key]);

  return (
    <div className="space-y-4">
      <p className="text-base text-gray-600 dark:text-gray-400">
        Overall confidence: <strong>{Math.round(fields.overallConfidence * 100)}%</strong>
        {' '}({fields.extractionSource})
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {entries.map(([key, val]) => (
          <div key={key}>
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
              {FIELD_LABELS[key]}
              <span className="text-sm font-normal text-gray-400 ml-2">{Math.round((val as FieldValue).confidence * 100)}%</span>
            </label>
            <input
              type="text"
              value={(val as FieldValue).value}
              onChange={(e) => updateField(key, e.target.value)}
              className={design.input}
            />
          </div>
        ))}
      </div>
      {entries.length === 0 && (
        <p className="text-base text-gray-500">No fields extracted yet. Connect OCR or LLM provider for scanned documents, or upload a text file.</p>
      )}
    </div>
  );
}
