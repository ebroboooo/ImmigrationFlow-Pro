import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateHeuristicInsights } from './caseCopilotHeuristics.ts';
import type { CaseContext } from '../../../domain/ai/CaseContext';

const baseContext: CaseContext = {
  scope: { type: 'client', clientId: 'c1' },
  tenantId: 't1',
  fingerprint: 'fp1',
  builtAt: new Date().toISOString(),
  client: {
    id: 'c1',
    name: 'Jane Doe',
    immigrationStatus: 'Active Case',
    updatedAt: new Date().toISOString(),
  },
  cases: [{
    id: 'case1',
    name: 'I-485 Adjustment',
    caseType: 'Adjustment of Status',
    stage: 'Pending USCIS',
    updatedAt: new Date().toISOString(),
  }],
  documents: [],
  tasks: [{ id: 't1', title: 'Review RFE', status: 'Todo', priority: 'High', type: 'Custom' }],
  deadlines: [{
    id: 'd1',
    title: 'RFE Response',
    type: 'RFE Deadline',
    date: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    status: 'Pending',
  }],
  appointments: [],
  invoices: [],
  notes: [],
  activities: [],
  intakeSessions: [],
  timelineEvents: [],
  billingSummary: { totalInvoiced: 0, totalPaid: 0, outstanding: 0, overdueCount: 0 },
};

describe('caseCopilotHeuristics', () => {
  it('generates insights from case context', () => {
    const insights = generateHeuristicInsights(baseContext);
    assert.match(insights.executiveSummary, /Jane Doe/);
    assert.equal(insights.openTasks.length, 1);
    assert.ok(insights.upcomingDeadlines.length >= 1);
    assert.equal(insights.providerId, 'heuristic');
  });

  it('flags missing contact info', () => {
    const insights = generateHeuristicInsights(baseContext);
    assert.ok(insights.riskItems.some((r) => r.category === 'Contact'));
  });
});
