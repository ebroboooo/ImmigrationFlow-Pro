import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCaseCopilotInsights } from './caseCopilotResponseParser.ts';
import type { CaseContext } from '../../../../domain/ai/CaseContext';

const context: CaseContext = {
  scope: { type: 'case', clientId: 'c1', caseId: 'case1' },
  tenantId: 't1',
  fingerprint: 'fp',
  builtAt: new Date().toISOString(),
  client: { id: 'c1', name: 'Test', updatedAt: new Date().toISOString() },
  cases: [],
  documents: [],
  tasks: [],
  deadlines: [],
  appointments: [],
  invoices: [],
  notes: [],
  activities: [],
  intakeSessions: [],
  timelineEvents: [],
  billingSummary: { totalInvoiced: 0, totalPaid: 0, outstanding: 0, overdueCount: 0 },
};

const SAMPLE = JSON.stringify({
  executiveSummary: 'Case summary here.',
  currentStatus: 'Pending USCIS',
  timelineSummary: '5 events.',
  timelineNarrative: 'Filed then pending.',
  missingDocuments: ['Passport'],
  upcomingDeadlines: [{ title: 'RFE', date: '2026-08-01', type: 'RFE Deadline' }],
  openTasks: [{ title: 'Respond', priority: 'High' }],
  riskLevel: 'medium',
  riskItems: [{ category: 'Documents', severity: 'medium', message: 'Missing passport', recommendation: 'Request copy' }],
  suggestedNextActions: ['Gather documents'],
});

describe('caseCopilotResponseParser', () => {
  it('parses Gemini case insights JSON', () => {
    const result = parseCaseCopilotInsights(SAMPLE, context, 'gemini');
    assert.equal(result.executiveSummary, 'Case summary here.');
    assert.equal(result.riskLevel, 'medium');
    assert.equal(result.missingDocuments[0], 'Passport');
    assert.equal(result.providerId, 'gemini');
  });
});
