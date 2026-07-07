export interface ReceiptValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/** 3-letter prefix + 10 digits — matches USCIS public case status format (any prefix). */
const RECEIPT_FORMAT = /^[A-Z]{3}\d{10}$/;

export function normalizeReceiptNumber(input: string): string {
  return input.trim().replace(/[\s-]+/g, '').toUpperCase();
}

export function validateReceiptNumber(input: string): ReceiptValidationResult {
  const normalized = normalizeReceiptNumber(input);

  if (!normalized) {
    return { valid: false, normalized, error: 'Receipt number is required.' };
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Receipt number contains invalid characters. Use letters and numbers only.',
    };
  }

  if (!RECEIPT_FORMAT.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Invalid receipt format. Expected 3 letters followed by 10 digits (e.g. IOE1234567890).',
    };
  }

  return { valid: true, normalized };
}
