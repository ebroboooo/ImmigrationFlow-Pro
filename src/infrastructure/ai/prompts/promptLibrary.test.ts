import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDocumentAnalysisPrompt, getDocumentIntelligencePrompt, PROMPT_LIBRARY_VERSION } from './promptLibrary.ts';

describe('promptLibrary', () => {
  it('returns versioned document analysis prompt', () => {
    const { prompt, version } = getDocumentAnalysisPrompt({
      text: 'Receipt Number: MSC123',
      fileName: 'notice.pdf',
      documentTypeHint: 'USCIS Receipt Notice (I-797C)',
    });
    assert.equal(version, '1.0.0');
    assert.match(prompt, /Receipt Number: MSC123/);
    assert.match(prompt, /notice\.pdf/);
    assert.match(prompt, /immigration law document analyst/);
  });

  it('returns document intelligence prompt with USCIS terminology', () => {
    const { prompt, version } = getDocumentIntelligencePrompt({
      text: 'Receipt Number MSC2190123456',
      fileName: 'i797c.pdf',
    });
    assert.equal(version, PROMPT_LIBRARY_VERSION);
    assert.match(prompt, /I-130/);
    assert.match(prompt, /document intelligence engine/);
    assert.match(prompt, /schemaFields/);
  });
});
