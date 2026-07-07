import { IMMIGRATION_TERMINOLOGY } from './immigrationKnowledge.v1';
import { getSchemaForDocumentType } from '../schemas/documentSchemaRegistry';
import { normalizeDocumentType, type ImmigrationDocumentType } from '../../../domain/ai/DocumentClassification';

export const DOCUMENT_INTELLIGENCE_PROMPT_VERSION = '1.0.0';

const DOCUMENT_TYPES_LIST = [
  'USCIS Receipt Notice (I-797C)',
  'USCIS Approval Notice',
  'USCIS Interview Notice',
  'USCIS Biometrics Appointment',
  'Request For Evidence (RFE)',
  'Notice of Intent to Deny (NOID)',
  'Passport', 'Visa', 'Green Card', 'Employment Authorization Card',
  'Naturalization Certificate', 'Birth Certificate', 'Marriage Certificate', 'Divorce Certificate',
  'Driver License', 'State ID', 'Social Security Card', 'Police Clearance', 'Court Records',
  'Medical Examination', 'Tax Documents', 'Financial Documents', 'Employment Documents', 'Unknown',
].join(', ');

export function buildDocumentIntelligencePrompt(params: {
  text: string;
  fileName: string;
  documentTypeHint?: string;
}): string {
  const hint = params.documentTypeHint
    ? normalizeDocumentType(params.documentTypeHint)
    : 'Unknown';
  const schema = getSchemaForDocumentType(hint as ImmigrationDocumentType);
  const fieldKeys = schema.fields.map((f) => f.key).join(', ');

  const truncated = params.text.length > 120_000
    ? `${params.text.slice(0, 120_000)}\n\n[Document truncated for model limits.]`
    : params.text;

  return `You are an expert U.S. immigration law document intelligence engine for law firms.

${IMMIGRATION_TERMINOLOGY}

Analyze the document and return ONLY valid JSON. Use null for unknown fields. Confidence is 0-1.

Document file name: ${params.fileName}
Hint classification: ${hint}
Schema field keys for this document type: ${fieldKeys}

Supported document types: ${DOCUMENT_TYPES_LIST}

Required JSON structure:
{
  "detection": { "documentType": "string", "confidence": number, "reason": "string" },
  "schemaFields": { "<fieldKey>": { "value": "string", "confidence": number, "sourceSnippet": "string" } or null },
  "persons": [{ "role": "Client|Beneficiary|Petitioner|Sponsor|Attorney|Interpreter|Translator|Employer|Dependent|Guardian|Other", "name": { "value", "confidence", "sourceSnippet" }, "dateOfBirth", "nationality", "phone", "email", "address", "relationship", "confidence": number }],
  "caseEntity": {
    "receiptNumber", "aNumber", "caseNumber", "uscisOnlineAccountNumber", "priorityDate",
    "caseCategory", "visaCategory", "currentStatus", "serviceCenter", "office",
    "deadlines": [{ "value", "confidence", "sourceSnippet" }],
    "rfeDates", "interviewDates", "biometricsDates", "expirationDates": same array format
  },
  "summaries": { "plainEnglish", "attorney", "client", "internalNote" },
  "tasks": [{ "title", "description", "priority": "Low|Medium|High", "dueDate", "responsibleRole": "Attorney|Paralegal|Client", "urgency" }],
  "calendarEvents": [{ "title", "type": "Interview|Biometrics|Deadline|Follow-up|Document Request|Client Meeting", "start", "end", "location", "notes" }],
  "deadlines": [{ "title", "type", "date" }],
  "email": { "subject", "body", "to" },
  "missingDocuments": ["string"],
  "missingInformation": ["string"],
  "requestedEvidence": ["string"],
  "smartRecommendations": [{ "category": "missing_document|appointment|deadline|rfe_risk|legal_action|email|calendar|task", "title", "description", "priority": "low|medium|high" }],
  "recommendedNextSteps": ["string"],
  "warnings": ["string"],
  "riskLevel": "low|medium|high|critical",
  "overallConfidence": number
}

Each extracted field must include value, confidence, and sourceSnippet (quote from document text when possible).

DOCUMENT TEXT:
${truncated}`;
}
