import { validateReceiptNumber } from '../../../domain/uscis/receiptValidator';
import type { IntelligentFieldValue, FieldValidation, IntelligenceWarning } from '../../../domain/ai/DocumentIntelligence';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s().+\-]{7,20}$/;
const A_NUMBER_RE = /^A?\d{8,9}$/i;
const DATE_RE = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$|^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$|^[A-Za-z]+\s+\d{1,2},?\s+\d{4}$/;

function validateEmail(value: string): FieldValidation {
  if (!value.trim()) return { status: 'unverified' };
  return EMAIL_RE.test(value.trim())
    ? { status: 'valid' }
    : { status: 'invalid', message: 'Email format appears invalid.' };
}

function validatePhone(value: string): FieldValidation {
  if (!value.trim()) return { status: 'unverified' };
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return { status: 'invalid', message: 'Phone number too short.' };
  return PHONE_RE.test(value.trim())
    ? { status: 'valid' }
    : { status: 'warning', message: 'Phone format may be incomplete.' };
}

function validateDate(value: string): FieldValidation {
  if (!value.trim()) return { status: 'unverified' };
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return DATE_RE.test(value.trim())
      ? { status: 'warning', message: 'Date format recognized but not fully parsed.' }
      : { status: 'invalid', message: 'Date format unrecognized.' };
  }
  const d = new Date(parsed);
  const now = new Date();
  if (d.getFullYear() < 1900) return { status: 'invalid', message: 'Date year appears impossible.' };
  if (d > new Date(now.getFullYear() + 10, 11, 31)) {
    return { status: 'warning', message: 'Date is far in the future.' };
  }
  return { status: 'valid' };
}

function validateReceipt(value: string): FieldValidation {
  const result = validateReceiptNumber(value);
  return result.valid
    ? { status: 'valid' }
    : { status: 'invalid', message: result.error };
}

function validateANumber(value: string): FieldValidation {
  const normalized = value.replace(/\s/g, '').toUpperCase();
  return A_NUMBER_RE.test(normalized)
    ? { status: 'valid' }
    : { status: 'warning', message: 'A-Number format may be incomplete (expected 8-9 digits).' };
}

export function validateFieldByKey(key: string, value: string): FieldValidation {
  const k = key.toLowerCase();
  if (k.includes('email')) return validateEmail(value);
  if (k.includes('phone')) return validatePhone(value);
  if (k.includes('receipt')) return validateReceipt(value);
  if (k === 'anumber' || k.includes('a-number') || k === 'a number') return validateANumber(value);
  if (k.includes('date') || k.includes('deadline') || k.includes('dob') || k.includes('birth')) {
    return validateDate(value);
  }
  return { status: 'unverified' };
}

export function enrichFieldWithValidation(field: IntelligentFieldValue, key: string): IntelligentFieldValue {
  return {
    ...field,
    validation: validateFieldByKey(key, field.value),
  };
}

export function detectDuplicateNames(personNames: string[]): IntelligenceWarning[] {
  const warnings: IntelligenceWarning[] = [];
  const seen = new Map<string, number>();
  for (const name of personNames) {
    const norm = name.trim().toLowerCase();
    if (!norm) continue;
    seen.set(norm, (seen.get(norm) ?? 0) + 1);
  }
  for (const [name, count] of seen) {
    if (count > 1) {
      warnings.push({
        field: 'persons',
        message: `Duplicate person name detected: "${name}" appears ${count} times.`,
        severity: 'warning',
      });
    }
  }
  return warnings;
}

export function validateAllFields(
  fields: Record<string, IntelligentFieldValue | null>,
): { fields: Record<string, IntelligentFieldValue | null>; warnings: IntelligenceWarning[] } {
  const warnings: IntelligenceWarning[] = [];
  const enriched: Record<string, IntelligentFieldValue | null> = {};

  for (const [key, field] of Object.entries(fields)) {
    if (!field) {
      enriched[key] = null;
      continue;
    }
    const validated = enrichFieldWithValidation(field, key);
    enriched[key] = validated;
    if (validated.validation?.status === 'invalid') {
      warnings.push({
        field: key,
        message: validated.validation.message ?? `Invalid value for ${key}.`,
        severity: 'error',
      });
    } else if (validated.validation?.status === 'warning') {
      warnings.push({
        field: key,
        message: validated.validation.message ?? `Suspicious value for ${key}.`,
        severity: 'warning',
      });
    }
  }

  return { fields: enriched, warnings };
}
