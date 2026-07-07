import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocumentIntelligenceResponse } from './documentIntelligenceParser.ts';

const SAMPLE = JSON.stringify({
  detection: {
    documentType: 'USCIS Receipt Notice (I-797C)',
    confidence: 0.92,
    reason: 'Contains receipt notice language and I-797C form reference.',
  },
  schemaFields: {
    receiptNumber: { value: 'MSC2190123456', confidence: 0.95, sourceSnippet: 'Receipt Number MSC2190123456' },
    formNumber: { value: 'I-485', confidence: 0.9, sourceSnippet: 'Form I-485' },
  },
  persons: [{
    role: 'Beneficiary',
    name: { value: 'Jane Doe', confidence: 0.9, sourceSnippet: 'Beneficiary: Jane Doe' },
    confidence: 0.9,
  }],
  caseEntity: {
    receiptNumber: { value: 'MSC2190123456', confidence: 0.95, sourceSnippet: 'MSC2190123456' },
    priorityDate: { value: '2024-01-15', confidence: 0.8, sourceSnippet: 'Priority Date: 01/15/2024' },
  },
  summaries: {
    plainEnglish: 'Receipt notice for I-485.',
    attorney: 'File and track case.',
    client: 'We received your case.',
    internalNote: 'Add to CRM.',
  },
  tasks: [{ title: 'Notify client', description: 'Call client', priority: 'High', responsibleRole: 'Paralegal' }],
  calendarEvents: [{ title: 'Follow-up', type: 'Follow-up', start: '2026-08-01T10:00:00Z' }],
  deadlines: [{ title: 'Card production', type: 'USCIS', date: '2026-09-01' }],
  email: { subject: 'Case update', body: 'Dear client...' },
  missingDocuments: ['Passport copy'],
  missingInformation: ['Biometrics date'],
  requestedEvidence: [],
  smartRecommendations: [{ category: 'task', title: 'Update CRM', description: 'Add receipt to case', priority: 'medium' }],
  recommendedNextSteps: ['Update CRM case status'],
  warnings: ['Verify priority date'],
  riskLevel: 'low',
  overallConfidence: 0.88,
});

describe('documentIntelligenceParser', () => {
  it('parses full intelligence response', () => {
    const result = parseDocumentIntelligenceResponse(SAMPLE);
    assert.equal(result.geminiAnalysis.classification.documentType, 'USCIS Receipt Notice (I-797C)');
    assert.equal(result.intelligence.detection?.reason, 'Contains receipt notice language and I-797C form reference.');
    assert.equal(result.intelligence.persons?.length, 1);
    assert.equal(result.intelligence.persons?.[0].role, 'Beneficiary');
    assert.equal(result.intelligence.caseEntity?.receiptNumber?.value, 'MSC2190123456');
    assert.equal(result.intelligence.smartRecommendations?.length, 1);
    assert.ok(Math.abs(result.geminiAnalysis.overallConfidence - 0.88) < 0.001);
  });

  it('normalizes legacy document type aliases', () => {
    const legacy = JSON.stringify({
      classification: { documentType: 'RFE', confidence: 0.9 },
      fields: { receiptNumber: { value: 'IOE1234567890', confidence: 0.8 } },
      summaries: { plainEnglish: '', attorney: '', client: '', internalNote: '' },
      tasks: [],
      calendarEvents: [],
      deadlines: [],
      email: { subject: '', body: '' },
      missingDocuments: [],
      requestedEvidence: [],
      recommendedNextSteps: [],
      warnings: [],
      riskLevel: 'medium',
      overallConfidence: 0.8,
    });
    const result = parseDocumentIntelligenceResponse(legacy);
    assert.equal(result.geminiAnalysis.classification.documentType, 'Request For Evidence (RFE)');
  });
});
