import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { linkDocumentsToEntities } from './documentLinkingEngine.ts';
import type { MigrationPreview } from '../../../domain/import/MigrationTypes';

describe('documentLinkingEngine', () => {
  it('links passport PDF to client by name in path', () => {
    const preview: MigrationPreview = {
      clients: [{ key: 'c-jane', name: 'Jane Doe', sourceRow: 2, spreadsheetId: 's1' }],
      leads: [], cases: [], tasks: [], deadlines: [], appointments: [], invoices: [], documents: [],
      duplicates: [], warnings: [], errors: [], estimatedSeconds: 0, totalRows: 1,
    };
    const linked = linkDocumentsToEntities([{
      path: 'Jane Doe/passport.pdf',
      fileName: 'passport.pdf',
      size: 1024,
      blob: new Blob(['test']),
    }], preview);
    assert.equal(linked.length, 1);
    assert.equal(linked[0].detectedType, 'passport');
    assert.equal(linked[0].linkedEntityKey, 'c-jane');
    assert.ok(linked[0].linkConfidence >= 0.5);
  });

  it('detects receipt number in filename', () => {
    const preview: MigrationPreview = {
      clients: [],
      leads: [],
      cases: [{
        key: 'case1', name: 'Case', clientKey: 'c1',
        uscisReceiptNumber: 'IOE1234567890', sourceRow: 2, spreadsheetId: 's1',
      }],
      tasks: [], deadlines: [], appointments: [], invoices: [], documents: [],
      duplicates: [], warnings: [], errors: [], estimatedSeconds: 0, totalRows: 1,
    };
    const linked = linkDocumentsToEntities([{
      path: 'IOE1234567890_i797.pdf',
      fileName: 'IOE1234567890_i797.pdf',
      size: 2048,
      blob: new Blob(['pdf']),
    }], preview);
    assert.equal(linked[0].linkedEntityKey, 'case1');
    assert.equal(linked[0].linkedEntityType, 'case');
  });
});
