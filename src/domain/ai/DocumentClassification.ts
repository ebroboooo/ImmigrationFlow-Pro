/** Extend by adding entries to IMMIGRATION_DOCUMENT_TYPES and classification rules. */
export const IMMIGRATION_DOCUMENT_TYPES = [
  'USCIS Receipt Notice (I-797C)',
  'USCIS Approval Notice',
  'USCIS Interview Notice',
  'USCIS Biometrics Appointment',
  'Request For Evidence (RFE)',
  'Notice of Intent to Deny (NOID)',
  'Passport',
  'Visa',
  'Green Card',
  'Employment Authorization Card',
  'Naturalization Certificate',
  'Birth Certificate',
  'Marriage Certificate',
  'Divorce Certificate',
  'Driver License',
  'State ID',
  'Social Security Card',
  'Police Clearance',
  'Court Records',
  'Medical Examination',
  'Tax Documents',
  'Financial Documents',
  'Employment Documents',
  'I-797',
  'I-130',
  'I-485',
  'I-765',
  'I-864',
  'Unknown',
] as const;

export type ImmigrationDocumentType = (typeof IMMIGRATION_DOCUMENT_TYPES)[number];

export interface ClassificationResult {
  documentType: ImmigrationDocumentType;
  confidence: number;
  source: 'heuristic' | 'llm' | 'manual';
  reason?: string;
  matchedSignals?: string[];
}

/** Maps legacy and alias labels to canonical document types. */
export const DOCUMENT_TYPE_ALIASES: Record<string, ImmigrationDocumentType> = {
  'receipt notice': 'USCIS Receipt Notice (I-797C)',
  'i-797c': 'USCIS Receipt Notice (I-797C)',
  'i-797': 'USCIS Receipt Notice (I-797C)',
  'approval notice': 'USCIS Approval Notice',
  'interview notice': 'USCIS Interview Notice',
  'biometrics notice': 'USCIS Biometrics Appointment',
  'biometrics appointment': 'USCIS Biometrics Appointment',
  rfe: 'Request For Evidence (RFE)',
  'request for evidence': 'Request For Evidence (RFE)',
  noid: 'Notice of Intent to Deny (NOID)',
  'notice of intent to deny': 'Notice of Intent to Deny (NOID)',
  'denial notice': 'Notice of Intent to Deny (NOID)',
  'medical exam': 'Medical Examination',
  'medical examination': 'Medical Examination',
  'i-693': 'Medical Examination',
  ead: 'Employment Authorization Card',
  'employment authorization': 'Employment Authorization Card',
  'driver license': 'Driver License',
  "driver's license": 'Driver License',
  'state id': 'State ID',
  'social security card': 'Social Security Card',
  'tax document': 'Tax Documents',
  'financial document': 'Financial Documents',
  'employment document': 'Employment Documents',
};

export function normalizeDocumentType(raw: string): ImmigrationDocumentType {
  const trimmed = raw.trim();
  if (!trimmed) return 'Unknown';
  const lower = trimmed.toLowerCase();
  const alias = DOCUMENT_TYPE_ALIASES[lower];
  if (alias) return alias;
  const exact = IMMIGRATION_DOCUMENT_TYPES.find((t) => t.toLowerCase() === lower);
  if (exact) return exact;
  const partial = IMMIGRATION_DOCUMENT_TYPES.find(
    (t) => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower),
  );
  return partial ?? 'Unknown';
}
