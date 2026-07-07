import type { ClassificationResult } from '../../domain/ai/DocumentClassification';
import type { ExtractedImmigrationFields } from '../../domain/ai/ExtractedFields';
import { fieldValue } from '../../domain/ai/ExtractedFields';
import type { DocumentIntelligenceResult, IntelligentFieldValue } from '../../domain/ai/DocumentIntelligence';
import { createIntelligentField, emptyCaseEntity } from '../../domain/ai/DocumentIntelligence';
import type { ParsedIntelligencePayload } from '../../domain/ai/DocumentIntelligence';
import { getSchemaForDocumentType } from '../../infrastructure/ai/schemas/documentSchemaRegistry';
import { validateAllFields, detectDuplicateNames } from '../../infrastructure/ai/validation/fieldValidationService';
import { findCRMMatches } from './crmMatchingService';
import { generateId } from '../../lib/utils';

export interface BuildIntelligenceInput {
  tenantId: string;
  parsed?: ParsedIntelligencePayload;
  classification: ClassificationResult;
  patternFields: ExtractedImmigrationFields;
  ocrConfidence?: number;
  promptVersion?: string;
}

function patternToIntelligent(
  value: string | undefined,
  confidence: number,
  ocrConfidence?: number,
): IntelligentFieldValue | undefined {
  if (!value) return undefined;
  return createIntelligentField(value, confidence, 'pattern', { ocrConfidence });
}

async function buildFromPatterns(input: BuildIntelligenceInput): Promise<DocumentIntelligenceResult> {
  const { classification, patternFields, ocrConfidence } = input;
  const schema = getSchemaForDocumentType(classification.documentType);
  const fields: Record<string, IntelligentFieldValue | null> = {};

  const pf = patternFields;
  const mappings: [string, string | undefined][] = [
    ['receiptNumber', pf.receiptNumber?.value],
    ['formNumber', pf.uscisForm?.value],
    ['caseType', pf.caseType?.value],
    ['noticeDate', pf.noticeDate?.value],
    ['petitioner', pf.petitioner?.value],
    ['beneficiary', pf.beneficiary?.value],
    ['uscisOffice', pf.office?.value],
    ['attorney', pf.attorney?.value],
    ['fullName', pf.clientName?.value],
  ];

  for (const [key, val] of mappings) {
    if (val) {
      const src = patternFields.receiptNumber?.source === 'pattern' ? 'pattern' : 'pattern';
      const conf = pf.receiptNumber?.confidence ?? patternFields.overallConfidence;
      fields[key] = patternToIntelligent(val, conf, ocrConfidence) ?? null;
      if (fields[key]) fields[key]!.extractionMethod = src as 'pattern';
    }
  }

  const persons = [];
  if (pf.clientName?.value) {
    persons.push({
      id: generateId(),
      role: 'Client' as const,
      name: patternToIntelligent(pf.clientName.value, pf.clientName.confidence, ocrConfidence),
      email: patternToIntelligent(pf.email?.value, pf.email?.confidence ?? 0.7, ocrConfidence),
      phone: patternToIntelligent(pf.phone?.value, pf.phone?.confidence ?? 0.7, ocrConfidence),
      address: patternToIntelligent(pf.address?.value, pf.address?.confidence ?? 0.7, ocrConfidence),
      confidence: pf.clientName.confidence,
    });
  }
  if (pf.beneficiary?.value) {
    persons.push({
      id: generateId(),
      role: 'Beneficiary' as const,
      name: patternToIntelligent(pf.beneficiary.value, pf.beneficiary.confidence, ocrConfidence),
      confidence: pf.beneficiary.confidence,
    });
  }
  if (pf.petitioner?.value) {
    persons.push({
      id: generateId(),
      role: 'Petitioner' as const,
      name: patternToIntelligent(pf.petitioner.value, pf.petitioner.confidence, ocrConfidence),
      confidence: pf.petitioner.confidence,
    });
  }

  const caseEntity = {
    receiptNumber: patternToIntelligent(pf.receiptNumber?.value, pf.receiptNumber?.confidence ?? 0, ocrConfidence),
    aNumber: patternToIntelligent(pf.aNumber?.value, pf.aNumber?.confidence ?? 0, ocrConfidence),
    priorityDate: patternToIntelligent(pf.priority?.value, pf.priority?.confidence ?? 0, ocrConfidence),
    office: patternToIntelligent(pf.office?.value, pf.office?.confidence ?? 0, ocrConfidence),
    interviewDates: pf.interviewDate?.value
      ? [patternToIntelligent(pf.interviewDate.value, pf.interviewDate.confidence, ocrConfidence)!]
      : [],
    biometricsDates: pf.biometricsDate?.value
      ? [patternToIntelligent(pf.biometricsDate.value, pf.biometricsDate.confidence, ocrConfidence)!]
      : [],
    deadlines: (pf.deadlines ?? []).map((d) => patternToIntelligent(d.value, d.confidence, ocrConfidence)!),
  };

  const { fields: validatedFields, warnings: validationWarnings } = validateAllFields(fields);
  const nameWarnings = detectDuplicateNames(persons.map((p) => p.name?.value ?? '').filter(Boolean));

  const missingRequired = schema.fields
    .filter((f) => f.required && !validatedFields[f.key]?.value)
    .map((f) => f.label);

  const crmMatching = await findCRMMatches({ tenantId: input.tenantId, caseEntity, persons });

  return {
    detection: {
      documentType: classification.documentType,
      confidence: classification.confidence,
      reason: classification.reason ?? `Heuristic classification: ${classification.documentType}`,
      source: classification.source,
      matchedSignals: classification.matchedSignals,
    },
    schemaExtraction: { documentType: classification.documentType, fields: validatedFields },
    persons,
    caseEntity,
    warnings: [...validationWarnings, ...nameWarnings],
    missingInformation: missingRequired,
    smartRecommendations: buildPatternRecommendations(classification.documentType, missingRequired),
    crmMatching,
    overallConfidence: patternFields.overallConfidence,
    promptVersion: input.promptVersion,
  };
}

function buildPatternRecommendations(
  documentType: string,
  missing: string[],
): DocumentIntelligenceResult['smartRecommendations'] {
  const recs: DocumentIntelligenceResult['smartRecommendations'] = [];
  for (const m of missing) {
    recs.push({ category: 'missing_document', title: `Missing: ${m}`, description: `Required field "${m}" was not extracted.`, priority: 'medium' });
  }
  if (documentType.includes('RFE')) {
    recs.push({ category: 'rfe_risk', title: 'RFE response required', description: 'Verify response deadline and gather requested evidence.', priority: 'high' });
  }
  if (documentType.includes('Biometrics')) {
    recs.push({ category: 'appointment', title: 'Biometrics appointment', description: 'Schedule calendar reminder for ASC appointment.', priority: 'high' });
  }
  if (documentType.includes('Interview')) {
    recs.push({ category: 'appointment', title: 'Interview scheduled', description: 'Prepare client for USCIS interview.', priority: 'high' });
  }
  return recs;
}

export async function buildDocumentIntelligence(input: BuildIntelligenceInput): Promise<DocumentIntelligenceResult> {
  if (!input.parsed) {
    return buildFromPatterns(input);
  }

  const partial = input.parsed.intelligence;
  const gemini = input.parsed.geminiAnalysis;
  let fields = partial.schemaExtraction?.fields ?? {};
  const persons = partial.persons ?? [];
  const caseEntity = partial.caseEntity ?? emptyCaseEntity();

  const { fields: validatedFields, warnings: validationWarnings } = validateAllFields(fields);
  fields = validatedFields;

  const nameWarnings = detectDuplicateNames(persons.map((p) => p.name?.value ?? '').filter(Boolean));
  const llmWarnings = (partial.warnings ?? []).map((w) =>
    typeof w === 'string' ? { message: w, severity: 'warning' as const } : w,
  );

  const schema = getSchemaForDocumentType(gemini.classification.documentType);
  const missingRequired = schema.fields
    .filter((f) => f.required && !fields[f.key]?.value)
    .map((f) => f.label);
  const missingInformation = [...new Set([...(partial.missingInformation ?? []), ...missingRequired])];

  const smartRecommendations = partial.smartRecommendations?.length
    ? partial.smartRecommendations
    : buildPatternRecommendations(gemini.classification.documentType, missingRequired);

  const crmMatching = await findCRMMatches({
    tenantId: input.tenantId,
    caseEntity,
    persons,
  });

  return {
    detection: partial.detection ?? {
      documentType: gemini.classification.documentType,
      confidence: gemini.classification.confidence,
      reason: `LLM classification: ${gemini.classification.documentType}`,
      source: 'llm',
    },
    schemaExtraction: {
      documentType: gemini.classification.documentType,
      fields,
    },
    persons,
    caseEntity,
    warnings: [...llmWarnings, ...validationWarnings, ...nameWarnings],
    missingInformation,
    smartRecommendations,
    crmMatching,
    overallConfidence: partial.overallConfidence ?? gemini.overallConfidence,
    promptVersion: input.promptVersion,
  };
}

export function mapIntelligenceToLegacyFields(intelligence: DocumentIntelligenceResult): ExtractedImmigrationFields {
  const f = intelligence.schemaExtraction.fields;
  const c = intelligence.caseEntity;
  const client = intelligence.persons.find((p) => p.role === 'Client') ?? intelligence.persons[0];

  const pick = (field?: IntelligentFieldValue) =>
    field?.value ? fieldValue(field.value, field.confidence, field.extractionMethod === 'pattern' ? 'pattern' : 'llm') : undefined;

  const legacy: ExtractedImmigrationFields = {
    clientName: pick(client?.name),
    beneficiary: pick(intelligence.persons.find((p) => p.role === 'Beneficiary')?.name),
    petitioner: pick(intelligence.persons.find((p) => p.role === 'Petitioner')?.name),
    email: pick(client?.email ?? intelligence.persons.find((p) => p.email)?.email),
    phone: pick(client?.phone ?? intelligence.persons.find((p) => p.phone)?.phone),
    address: pick(client?.address ?? intelligence.persons.find((p) => p.address)?.address),
    receiptNumber: pick(c.receiptNumber ?? f.receiptNumber ?? undefined),
    aNumber: pick(c.aNumber ?? f.aNumber ?? undefined),
    uscisForm: pick(f.formNumber ?? undefined),
    caseType: pick(c.caseCategory ?? f.caseType ?? undefined),
    noticeType: fieldValue(intelligence.detection.documentType, intelligence.detection.confidence, 'llm'),
    priority: pick(c.priorityDate),
    office: pick(c.office ?? f.uscisOffice ?? undefined),
    attorney: pick(intelligence.persons.find((p) => p.role === 'Attorney')?.name),
    filingDate: pick(f.receivedDate ?? undefined),
    noticeDate: pick(f.noticeDate ?? undefined),
    interviewDate: pick(c.interviewDates?.[0]),
    biometricsDate: pick(c.biometricsDates?.[0]),
    deadlines: c.deadlines?.map((d) => fieldValue(d.value, d.confidence, 'llm')),
    overallConfidence: intelligence.overallConfidence,
    extractionSource: intelligence.detection.source === 'llm' ? 'hybrid' : 'pattern',
  };

  return legacy;
}

export const documentIntelligenceService = {
  build: buildDocumentIntelligence,
  mapToLegacyFields: mapIntelligenceToLegacyFields,
};