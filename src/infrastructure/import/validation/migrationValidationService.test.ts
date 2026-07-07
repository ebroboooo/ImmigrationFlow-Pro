import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateMigrationPreview } from './migrationValidationService.ts';
import type { MigrationPreview } from '../../../domain/import/MigrationTypes';

describe('migrationValidationService', () => {
  it('flags invalid receipt numbers', () => {
    const preview: MigrationPreview = {
      clients: [{ key: 'c1', name: 'Test', sourceRow: 2, spreadsheetId: 's1' }],
      leads: [],
      cases: [{
        key: 'case1', name: 'Case', clientKey: 'c1', uscisReceiptNumber: 'BAD',
        sourceRow: 3, spreadsheetId: 's1',
      }],
      tasks: [], deadlines: [], appointments: [], invoices: [], documents: [],
      duplicates: [], warnings: [], errors: [], estimatedSeconds: 0, totalRows: 1,
    };
    const { errors } = validateMigrationPreview(preview);
    assert.ok(errors.some((e) => e.field === 'receiptNumber'));
  });

  it('flags missing client name', () => {
    const preview: MigrationPreview = {
      clients: [{ key: 'c1', name: '', sourceRow: 2, spreadsheetId: 's1' }],
      leads: [], cases: [], tasks: [], deadlines: [], appointments: [], invoices: [], documents: [],
      duplicates: [], warnings: [], errors: [], estimatedSeconds: 0, totalRows: 1,
    };
    const { errors } = validateMigrationPreview(preview);
    assert.ok(errors.some((e) => e.message.includes('required')));
  });
});
