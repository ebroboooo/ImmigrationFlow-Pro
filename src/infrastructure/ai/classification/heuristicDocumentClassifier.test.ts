import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { heuristicDocumentClassifier } from './heuristicDocumentClassifier.ts';
import { patternFieldExtractor } from '../extraction/patternFieldExtractor.ts';

describe('HeuristicDocumentClassifier', () => {
  it('classifies I-797 notice of action', () => {
    const result = heuristicDocumentClassifier.classify(
      'U.S. Citizenship and Immigration Services Notice of Action I-797C',
      'notice-of-action.pdf',
    );
    assert.equal(result.documentType, 'USCIS Receipt Notice (I-797C)');
    assert.ok(result.confidence > 0.5);
    assert.ok(result.reason);
  });

  it('classifies RFE documents', () => {
    const result = heuristicDocumentClassifier.classify(
      'Request for Evidence. Please submit additional evidence.',
      'rfe-letter.pdf',
    );
    assert.equal(result.documentType, 'Request For Evidence (RFE)');
  });
});

describe('PatternFieldExtractor', () => {
  it('extracts USCIS receipt number', () => {
    const fields = patternFieldExtractor.extract(
      'Your receipt number is MSC2190123456 for form I-485.',
      'scan.pdf',
    );
    assert.equal(fields.receiptNumber?.value, 'MSC2190123456');
    assert.ok((fields.overallConfidence ?? 0) > 0);
  });
});
