import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectMigrationDuplicates } from './migrationDuplicateEngine.ts';
import type { MigrationPreview } from '../../../domain/import/MigrationTypes';

const emptyPreview = (): MigrationPreview => ({
  clients: [],
  leads: [],
  cases: [],
  tasks: [],
  deadlines: [],
  appointments: [],
  invoices: [],
  documents: [],
  duplicates: [],
  warnings: [],
  errors: [],
  estimatedSeconds: 0,
  totalRows: 0,
});

describe('migrationDuplicateEngine', () => {
  it('detects duplicate clients by email in CRM', () => {
    const preview = emptyPreview();
    preview.clients.push({
      key: 'c1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      sourceRow: 2,
      spreadsheetId: 's1',
    });
    const duplicates = detectMigrationDuplicates({
      preview,
      existingClients: [{
        id: 'existing-1',
        tenantId: 't1',
        name: 'Jane D.',
        email: 'jane@example.com',
        notes: '',
        lifetimeValue: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      existingCases: [],
      existingLeads: [],
    });
    assert.ok(duplicates.length >= 1);
    assert.equal(duplicates[0].entityType, 'client');
    assert.ok(duplicates[0].matchedOn.includes('email'));
  });

  it('detects duplicate cases by receipt number', () => {
    const preview = emptyPreview();
    preview.cases.push({
      key: 'case1',
      name: 'I-485 Case',
      clientKey: 'c1',
      uscisReceiptNumber: 'MSC2190123456',
      sourceRow: 3,
      spreadsheetId: 's1',
    });
    const duplicates = detectMigrationDuplicates({
      preview,
      existingClients: [],
      existingCases: [{
        id: 'case-existing',
        tenantId: 't1',
        name: 'Existing Case',
        clientId: 'c1',
        caseType: 'Adjustment of Status',
        value: 0,
        probability: 50,
        stage: 'Filed',
        uscisReceiptNumber: 'MSC2190123456',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      existingLeads: [],
    });
    assert.ok(duplicates.some((d) => d.matchedOn.includes('receiptNumber')));
  });
});
