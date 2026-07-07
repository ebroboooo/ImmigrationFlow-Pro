export const DOCUMENT_ANALYSIS_PROMPT_VERSION = '1.0.0';

export const DOCUMENT_ANALYSIS_JSON_SCHEMA = {
  classification: { documentType: 'string', confidence: 'number' },
  fields: 'object with optional keys: clientName, beneficiary, petitioner, email, phone, address, receiptNumber, aNumber, uscisForm, caseType, noticeType, filingDate, noticeDate, appointmentDate, interviewDate, biometricsDate — each { value, confidence } or null',
  summaries: { plainEnglish: 'string', attorney: 'string', client: 'string', internalNote: 'string' },
  tasks: '[{ title, description, priority, dueDate?, responsibleRole?, urgency? }]',
  calendarEvents: '[{ title, type, start, end?, location?, notes? }]',
  deadlines: '[{ title, type, date }]',
  email: '{ subject, body, to? }',
  missingDocuments: 'string[]',
  requestedEvidence: 'string[]',
  recommendedNextSteps: 'string[]',
  warnings: 'string[]',
  riskLevel: 'low|medium|high|critical',
  overallConfidence: 'number 0-1',
} as const;

export function buildDocumentAnalysisPrompt(params: {
  text: string;
  fileName: string;
  documentTypeHint?: string;
}): string {
  const truncated = params.text.length > 120_000
    ? `${params.text.slice(0, 120_000)}\n\n[Document truncated for model limits.]`
    : params.text;

  return `You are an expert immigration law document analyst for a U.S. immigration law firm.

Analyze the document text and return ONLY valid JSON matching the schema below. Use null for unknown fields. Confidence is 0-1.

Document file name: ${params.fileName}
Hint classification: ${params.documentTypeHint ?? 'Unknown'}

Required JSON keys:
- classification: { documentType, confidence }
- fields: immigration fields (clientName, beneficiary, petitioner, receiptNumber, aNumber, email, phone, address, caseType, noticeType, filingDate, noticeDate, interviewDate, biometricsDate, etc.)
- summaries: { plainEnglish, attorney, client, internalNote }
- tasks: suggested tasks with priority (Low|Medium|High), dueDate (ISO or readable), responsibleRole (Attorney|Paralegal|Client), urgency
- calendarEvents: type one of Interview|Biometrics|Deadline|Follow-up|Document Request|Client Meeting
- deadlines: USCIS/legal deadlines
- email: professional client email draft (do not send)
- missingDocuments, requestedEvidence, recommendedNextSteps, warnings arrays
- riskLevel: low|medium|high|critical
- overallConfidence: number 0-1

DOCUMENT TEXT:
${truncated}`;
}
