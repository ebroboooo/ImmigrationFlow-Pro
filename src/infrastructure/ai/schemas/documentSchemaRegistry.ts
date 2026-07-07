import type { ImmigrationDocumentType } from '../../../domain/ai/DocumentClassification';

export interface DocumentFieldSchema {
  key: string;
  label: string;
  required?: boolean;
}

export interface DocumentTypeSchema {
  documentType: ImmigrationDocumentType;
  label: string;
  fields: DocumentFieldSchema[];
}

const COMMON_USCIS_FIELDS: DocumentFieldSchema[] = [
  { key: 'receiptNumber', label: 'Receipt Number', required: true },
  { key: 'formNumber', label: 'Form Number' },
  { key: 'caseType', label: 'Case Type' },
  { key: 'noticeDate', label: 'Notice Date' },
  { key: 'receivedDate', label: 'Received Date' },
  { key: 'priorityDate', label: 'Priority Date' },
  { key: 'petitioner', label: 'Petitioner' },
  { key: 'beneficiary', label: 'Beneficiary' },
  { key: 'uscisOffice', label: 'USCIS Office' },
  { key: 'serviceCenter', label: 'Service Center' },
  { key: 'attorney', label: 'Attorney' },
  { key: 'barcodeNumbers', label: 'Barcode Numbers' },
  { key: 'onlineAccountNumber', label: 'Online Account Number' },
  { key: 'mailingAddress', label: 'Mailing Address' },
  { key: 'deadlines', label: 'Deadlines' },
  { key: 'appointmentData', label: 'Appointment Data' },
  { key: 'referenceNumbers', label: 'Reference Numbers' },
];

const IDENTITY_FIELDS: DocumentFieldSchema[] = [
  { key: 'fullName', label: 'Full Name', required: true },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'documentNumber', label: 'Document Number' },
  { key: 'issueDate', label: 'Issue Date' },
  { key: 'expirationDate', label: 'Expiration Date' },
  { key: 'issuingAuthority', label: 'Issuing Authority' },
  { key: 'address', label: 'Address' },
];

const FINANCIAL_FIELDS: DocumentFieldSchema[] = [
  { key: 'taxYear', label: 'Tax Year' },
  { key: 'employerName', label: 'Employer Name' },
  { key: 'incomeAmount', label: 'Income Amount' },
  { key: 'accountHolder', label: 'Account Holder' },
  { key: 'institutionName', label: 'Institution Name' },
  { key: 'statementPeriod', label: 'Statement Period' },
];

const EMPLOYMENT_FIELDS: DocumentFieldSchema[] = [
  { key: 'employerName', label: 'Employer Name', required: true },
  { key: 'employeeName', label: 'Employee Name' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'workLocation', label: 'Work Location' },
];

const RFE_FIELDS: DocumentFieldSchema[] = [
  ...COMMON_USCIS_FIELDS,
  { key: 'rfeIssueDate', label: 'RFE Issue Date', required: true },
  { key: 'responseDeadline', label: 'Response Deadline', required: true },
  { key: 'requestedEvidence', label: 'Requested Evidence' },
  { key: 'missingItems', label: 'Missing Items' },
];

const SCHEMAS: DocumentTypeSchema[] = [
  { documentType: 'USCIS Receipt Notice (I-797C)', label: 'USCIS Receipt Notice', fields: COMMON_USCIS_FIELDS },
  { documentType: 'USCIS Approval Notice', label: 'USCIS Approval Notice', fields: [...COMMON_USCIS_FIELDS, { key: 'approvalDate', label: 'Approval Date' }] },
  { documentType: 'USCIS Interview Notice', label: 'USCIS Interview Notice', fields: [...COMMON_USCIS_FIELDS, { key: 'interviewDate', label: 'Interview Date', required: true }, { key: 'interviewLocation', label: 'Interview Location' }] },
  { documentType: 'USCIS Biometrics Appointment', label: 'Biometrics Appointment', fields: [...COMMON_USCIS_FIELDS, { key: 'biometricsDate', label: 'Biometrics Date', required: true }, { key: 'ascLocation', label: 'ASC Location' }] },
  { documentType: 'Request For Evidence (RFE)', label: 'Request For Evidence', fields: RFE_FIELDS },
  { documentType: 'Notice of Intent to Deny (NOID)', label: 'Notice of Intent to Deny', fields: [...COMMON_USCIS_FIELDS, { key: 'responseDeadline', label: 'Response Deadline', required: true }, { key: 'denialGrounds', label: 'Denial Grounds' }] },
  { documentType: 'Passport', label: 'Passport', fields: IDENTITY_FIELDS },
  { documentType: 'Visa', label: 'Visa', fields: [...IDENTITY_FIELDS, { key: 'visaClass', label: 'Visa Class' }, { key: 'entries', label: 'Entries' }] },
  { documentType: 'Green Card', label: 'Green Card', fields: [...IDENTITY_FIELDS, { key: 'aNumber', label: 'A-Number' }, { key: 'category', label: 'Category' }] },
  { documentType: 'Employment Authorization Card', label: 'EAD Card', fields: [...IDENTITY_FIELDS, { key: 'aNumber', label: 'A-Number' }, { key: 'category', label: 'Category' }] },
  { documentType: 'Naturalization Certificate', label: 'Naturalization Certificate', fields: [...IDENTITY_FIELDS, { key: 'certificateNumber', label: 'Certificate Number' }] },
  { documentType: 'Birth Certificate', label: 'Birth Certificate', fields: [...IDENTITY_FIELDS, { key: 'placeOfBirth', label: 'Place of Birth' }, { key: 'parents', label: 'Parents' }] },
  { documentType: 'Marriage Certificate', label: 'Marriage Certificate', fields: [...IDENTITY_FIELDS, { key: 'spouseName', label: 'Spouse Name' }, { key: 'marriageDate', label: 'Marriage Date' }] },
  { documentType: 'Divorce Certificate', label: 'Divorce Certificate', fields: [...IDENTITY_FIELDS, { key: 'formerSpouse', label: 'Former Spouse' }, { key: 'decreeDate', label: 'Decree Date' }] },
  { documentType: 'Driver License', label: 'Driver License', fields: IDENTITY_FIELDS },
  { documentType: 'State ID', label: 'State ID', fields: IDENTITY_FIELDS },
  { documentType: 'Social Security Card', label: 'Social Security Card', fields: [...IDENTITY_FIELDS, { key: 'ssn', label: 'SSN' }] },
  { documentType: 'Police Clearance', label: 'Police Clearance', fields: [...IDENTITY_FIELDS, { key: 'clearanceDate', label: 'Clearance Date' }, { key: 'jurisdiction', label: 'Jurisdiction' }] },
  { documentType: 'Court Records', label: 'Court Records', fields: [...IDENTITY_FIELDS, { key: 'caseNumber', label: 'Case Number' }, { key: 'courtName', label: 'Court Name' }, { key: 'disposition', label: 'Disposition' }] },
  { documentType: 'Medical Examination', label: 'Medical Examination', fields: [...IDENTITY_FIELDS, { key: 'civilSurgeon', label: 'Civil Surgeon' }, { key: 'examDate', label: 'Exam Date' }, { key: 'formI693', label: 'Form I-693' }] },
  { documentType: 'Tax Documents', label: 'Tax Documents', fields: FINANCIAL_FIELDS },
  { documentType: 'Financial Documents', label: 'Financial Documents', fields: FINANCIAL_FIELDS },
  { documentType: 'Employment Documents', label: 'Employment Documents', fields: EMPLOYMENT_FIELDS },
  { documentType: 'I-797', label: 'I-797 Notice', fields: COMMON_USCIS_FIELDS },
  { documentType: 'I-130', label: 'I-130 Petition', fields: COMMON_USCIS_FIELDS },
  { documentType: 'I-485', label: 'I-485 Application', fields: COMMON_USCIS_FIELDS },
  { documentType: 'I-765', label: 'I-765 Application', fields: COMMON_USCIS_FIELDS },
  { documentType: 'I-864', label: 'I-864 Affidavit', fields: [...COMMON_USCIS_FIELDS, { key: 'sponsorName', label: 'Sponsor Name' }] },
  { documentType: 'Unknown', label: 'Unknown Document', fields: [...COMMON_USCIS_FIELDS, ...IDENTITY_FIELDS] },
];

const SCHEMA_MAP = new Map<ImmigrationDocumentType, DocumentTypeSchema>(
  SCHEMAS.map((s) => [s.documentType, s]),
);

export function getSchemaForDocumentType(documentType: ImmigrationDocumentType): DocumentTypeSchema {
  return SCHEMA_MAP.get(documentType) ?? SCHEMA_MAP.get('Unknown')!;
}

export function getAllDocumentSchemas(): DocumentTypeSchema[] {
  return [...SCHEMAS];
}

export function registerDocumentSchema(schema: DocumentTypeSchema): void {
  SCHEMA_MAP.set(schema.documentType, schema);
  const idx = SCHEMAS.findIndex((s) => s.documentType === schema.documentType);
  if (idx >= 0) SCHEMAS[idx] = schema;
  else SCHEMAS.push(schema);
}
