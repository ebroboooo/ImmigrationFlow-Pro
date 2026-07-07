import { validateReceiptNumber, normalizeReceiptNumber } from '../../../domain/uscis/receiptValidator';
import type { ExtractedImmigrationFields } from '../../../domain/ai/ExtractedFields';
import { fieldValue } from '../../../domain/ai/ExtractedFields';

const FORM_PATTERN = /\b(I[-\s]?(?:130|485|765|864|797|140|129|539|751|90|918|589))\b/gi;
const A_NUMBER_PATTERN = /\bA[-\s]?(\d{8,9})\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const DATE_PATTERN = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi;

function firstMatch(text: string, pattern: RegExp): string | undefined {
  const m = text.match(pattern);
  return m?.[0];
}

function normalizeForm(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '-').replace('I-', 'I-');
}

export class PatternFieldExtractor {
  extract(text: string, fileName: string): ExtractedImmigrationFields {
    const fields: ExtractedImmigrationFields = {
      overallConfidence: 0,
      extractionSource: 'pattern',
    };
    let scoreSum = 0;
    let scoreCount = 0;

    const add = (key: keyof ExtractedImmigrationFields, value: string | undefined, confidence: number) => {
      if (!value || key === 'overallConfidence' || key === 'extractionSource') return;
      (fields as unknown as Record<string, unknown>)[key] = fieldValue(value, confidence, 'pattern');
      scoreSum += confidence;
      scoreCount += 1;
    };

    const receiptCandidates = text.match(/\b[A-Z]{3}\d{10}\b/gi) ?? [];
    for (const candidate of receiptCandidates) {
      const normalized = normalizeReceiptNumber(candidate);
      const result = validateReceiptNumber(normalized);
      if (result.valid) {
        add('receiptNumber', normalized, 0.92);
        break;
      }
    }

    const formMatch = firstMatch(text, FORM_PATTERN);
    if (formMatch) add('uscisForm', normalizeForm(formMatch), 0.85);

    const aMatch = text.match(A_NUMBER_PATTERN);
    if (aMatch) add('aNumber', `A${aMatch[0].replace(/\D/g, '').slice(-9)}`, 0.8);

    const email = firstMatch(text, EMAIL_PATTERN);
    if (email) add('email', email.toLowerCase(), 0.75);

    const phone = firstMatch(text, PHONE_PATTERN);
    if (phone) add('phone', phone, 0.7);

    const dates = [...text.matchAll(DATE_PATTERN)].map((m) => m[0]);
    if (dates[0]) add('noticeDate', dates[0], 0.6);
    if (dates[1]) add('filingDate', dates[1], 0.55);

    const nameFromFile = fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b(I-?\d+|notice|receipt|scan|copy)\b/gi, '')
      .trim();
    if (nameFromFile.length > 3 && nameFromFile.split(' ').length >= 2) {
      add('clientName', nameFromFile, 0.4);
    }

    fields.overallConfidence = scoreCount ? Math.round((scoreSum / scoreCount) * 100) / 100 : 0;
    return fields;
  }
}

export const patternFieldExtractor = new PatternFieldExtractor();
