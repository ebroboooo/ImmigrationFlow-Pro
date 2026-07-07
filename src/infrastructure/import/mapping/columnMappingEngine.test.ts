import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapSpreadsheetColumns, mapColumn } from './columnMappingEngine.ts';

describe('columnMappingEngine', () => {
  it('maps common immigration column names', () => {
    const mappings = mapSpreadsheetColumns([
      'Client Name', 'E-mail', 'Receipt Number', 'A-Number', 'Priority Date', 'Case Type',
    ]);
    const byCol = Object.fromEntries(mappings.map((m) => [m.sourceColumn, m.targetField]));
    assert.equal(byCol['Client Name'], 'clientName');
    assert.equal(byCol['E-mail'], 'email');
    assert.equal(byCol['Receipt Number'], 'receiptNumber');
    assert.equal(byCol['A-Number'], 'aNumber');
    assert.equal(byCol['Priority Date'], 'priorityDate');
    assert.equal(byCol['Case Type'], 'caseType');
  });

  it('returns confidence scores', () => {
    const result = mapColumn('Applicant Name', new Set());
    assert.equal(result.targetField, 'clientName');
    assert.ok(result.confidence >= 0.5);
    assert.ok(result.reason.length > 0);
  });

  it('maps beneficiary and mobile aliases', () => {
    const used = new Set<string>();
    assert.equal(mapColumn('Beneficiary', used).targetField, 'beneficiary');
    assert.equal(mapColumn('Cell Phone', used).targetField, 'phone');
  });
});
