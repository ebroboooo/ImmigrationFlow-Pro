import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupOcrText } from './ocrTextCleanup.ts';
import { isLikelyNativeText } from '../extraction/nativePdfTextDetector.ts';

describe('ocrTextCleanup', () => {
  it('normalizes whitespace and merges wrapped lines', () => {
    const raw = 'This is a long sentence that continues\non the next line.\n\nReceipt  Number:  MSC1234567890';
    const cleaned = cleanupOcrText(raw);
    assert.match(cleaned, /continues on the next line/);
    assert.match(cleaned, /MSC1234567890/);
    assert.ok(!cleaned.includes('\r'));
  });

  it('fixes common OCR mistakes', () => {
    const cleaned = cleanupOcrText('l .797 Notice of Action');
    assert.match(cleaned, /I-797/);
  });
});

describe('isLikelyNativeText', () => {
  it('detects sufficient native PDF text', () => {
    assert.equal(isLikelyNativeText({
      hasSelectableText: true,
      text: 'A'.repeat(200),
      pageCount: 2,
      averageCharsPerPage: 100,
    }), true);
  });

  it('rejects scanned PDF with minimal text', () => {
    assert.equal(isLikelyNativeText({
      hasSelectableText: false,
      text: 'x',
      pageCount: 5,
      averageCharsPerPage: 0.2,
    }), false);
  });
});
