import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGeminiDocumentAnalysis, extractJsonFromText } from './geminiResponseParser.ts';

const SAMPLE = JSON.stringify({
  classification: { documentType: 'I-797', confidence: 0.92 },
  fields: {
    clientName: { value: 'Jane Doe', confidence: 0.9 },
    receiptNumber: { value: 'MSC2190123456', confidence: 0.95 },
  },
  summaries: {
    plainEnglish: 'Approval notice for I-485.',
    attorney: 'Review approval and update case timeline.',
    client: 'Your case was approved.',
    internalNote: 'File in client folder.',
  },
  tasks: [{ title: 'Notify client', description: 'Call client', priority: 'High', responsibleRole: 'Paralegal' }],
  calendarEvents: [{ title: 'Follow-up', type: 'Follow-up', start: '2026-08-01T10:00:00Z' }],
  deadlines: [{ title: 'Card production', type: 'USCIS', date: '2026-09-01' }],
  email: { subject: 'Case update', body: 'Dear client...' },
  missingDocuments: ['Passport copy'],
  requestedEvidence: [],
  recommendedNextSteps: ['Update CRM case status'],
  warnings: ['High priority deadline'],
  riskLevel: 'low',
  overallConfidence: 0.88,
});

describe('geminiResponseParser', () => {
  it('parses valid JSON analysis', () => {
    const result = parseGeminiDocumentAnalysis(SAMPLE);
    assert.equal(result.classification.documentType, 'USCIS Receipt Notice (I-797C)');
    assert.equal(result.fields.clientName?.value, 'Jane Doe');
    assert.match(result.summaries.attorney, /Review/);
    assert.equal(result.tasks[0].priority, 'High');
    assert.equal(result.riskLevel, 'low');
    assert.ok(Math.abs(result.overallConfidence - 0.88) < 0.001);
  });

  it('extracts JSON from fenced markdown', () => {
    const wrapped = 'Here is the result:\n```json\n' + SAMPLE + '\n```';
    assert.match(extractJsonFromText(wrapped), /"classification"/);
  });

  it('throws on malformed JSON', () => {
    assert.throws(() => parseGeminiDocumentAnalysis('not json'), /Malformed JSON|No JSON/);
  });
});
