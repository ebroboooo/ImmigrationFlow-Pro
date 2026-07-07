import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReceiptNumber, validateReceiptNumber } from './receiptValidator.ts';

describe('normalizeReceiptNumber', () => {
  it('trims and uppercases', () => {
    assert.equal(normalizeReceiptNumber('  mgl2621867924  '), 'MGL2621867924');
  });

  it('removes spaces and hyphens', () => {
    assert.equal(normalizeReceiptNumber('ioe-123-456-7890'), 'IOE1234567890');
  });
});

describe('validateReceiptNumber', () => {
  const legacyPrefixes = ['IOE', 'MSC', 'LIN', 'SRC', 'WAC', 'EAC'];

  for (const prefix of legacyPrefixes) {
    it(`accepts legacy prefix ${prefix}`, () => {
      const result = validateReceiptNumber(`${prefix}1234567890`);
      assert.equal(result.valid, true);
      assert.equal(result.normalized, `${prefix}1234567890`);
    });
  }

  it('accepts modern prefix MGL', () => {
    const result = validateReceiptNumber('MGL2621867924');
    assert.equal(result.valid, true);
    assert.equal(result.normalized, 'MGL2621867924');
  });

  it('accepts unknown 3-letter prefix', () => {
    const result = validateReceiptNumber('XYZ9876543210');
    assert.equal(result.valid, true);
  });

  it('accepts lowercase input', () => {
    const result = validateReceiptNumber('mgl2621867924');
    assert.equal(result.valid, true);
    assert.equal(result.normalized, 'MGL2621867924');
  });

  it('accepts mixed case with spaces', () => {
    const result = validateReceiptNumber('  MgL 2621867924 ');
    assert.equal(result.valid, true);
    assert.equal(result.normalized, 'MGL2621867924');
  });

  it('rejects empty input', () => {
    const result = validateReceiptNumber('   ');
    assert.equal(result.valid, false);
    assert.match(result.error ?? '', /required/i);
  });

  it('rejects invalid symbols', () => {
    const result = validateReceiptNumber('MGL2621867924!');
    assert.equal(result.valid, false);
    assert.match(result.error ?? '', /invalid characters/i);
  });

  it('rejects malformed — letters only', () => {
    const result = validateReceiptNumber('ABCDEFGHIJKLM');
    assert.equal(result.valid, false);
    assert.match(result.error ?? '', /format/i);
  });

  it('rejects malformed — too few digits', () => {
    const result = validateReceiptNumber('MGL262186');
    assert.equal(result.valid, false);
  });

  it('rejects malformed — too many digits', () => {
    const result = validateReceiptNumber('MGL26218679241');
    assert.equal(result.valid, false);
  });

  it('does not reject based on prefix whitelist', () => {
    const result = validateReceiptNumber('AAA1234567890');
    assert.equal(result.valid, true);
    assert.doesNotMatch(result.error ?? '', /prefix|supported|service center/i);
  });
});
