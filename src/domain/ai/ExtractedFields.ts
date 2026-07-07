export interface FieldValue<T = string> {
  value: T;
  confidence: number;
  source: 'pattern' | 'llm' | 'manual';
}

export interface ExtractedImmigrationFields {
  clientName?: FieldValue;
  beneficiary?: FieldValue;
  petitioner?: FieldValue;
  email?: FieldValue;
  phone?: FieldValue;
  address?: FieldValue;
  receiptNumber?: FieldValue;
  aNumber?: FieldValue;
  uscisForm?: FieldValue;
  caseType?: FieldValue;
  noticeType?: FieldValue;
  priority?: FieldValue;
  office?: FieldValue;
  attorney?: FieldValue;
  filingDate?: FieldValue;
  noticeDate?: FieldValue;
  appointmentDate?: FieldValue;
  interviewDate?: FieldValue;
  biometricsDate?: FieldValue;
  deadlines?: FieldValue<string>[];
  supportingDocumentsMentioned?: FieldValue<string>[];
  requiredActions?: FieldValue<string>[];
  missingDocuments?: FieldValue<string>[];
  overallConfidence: number;
  extractionSource: 'pattern' | 'llm' | 'hybrid' | 'manual';
}

export function emptyExtractedFields(): ExtractedImmigrationFields {
  return { overallConfidence: 0, extractionSource: 'manual' };
}

export function fieldValue(value: string, confidence: number, source: FieldValue['source'] = 'pattern'): FieldValue {
  return { value, confidence, source };
}
