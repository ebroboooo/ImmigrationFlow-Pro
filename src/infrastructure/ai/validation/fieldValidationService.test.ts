import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateFieldByKey, detectDuplicateNames } from './fieldValidationService.ts';

describe('fieldValidationService', () => {
  it('validates receipt number format', () => {
    const valid = validateFieldByKey('receiptNumber', 'MSC2190123456');
    assert.equal(valid.status, 'valid');
    const invalid = validateFieldByKey('receiptNumber', 'BAD123');
    assert.equal(invalid.status, 'invalid');
  });

  it('validates email format', () => {
    assert.equal(validateFieldByKey('email', 'client@example.com').status, 'valid');
    assert.equal(validateFieldByKey('email', 'not-an-email').status, 'invalid');
  });

  it('detects duplicate person names', () => {
    const warnings = detectDuplicateNames(['Jane Doe', 'Jane Doe', 'John Smith']);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, /jane doe/i);
  });
});
