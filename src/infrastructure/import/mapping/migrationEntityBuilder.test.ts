import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreviewFromSpreadsheets } from '../../../application/import/migrationEntityBuilder.ts';
import { mapSpreadsheetColumns } from './columnMappingEngine.ts';
import type { ParsedSpreadsheet } from '../../../domain/import/MigrationTypes';

describe('migrationEntityBuilder large dataset', () => {
  it('handles 1000+ rows efficiently', () => {
    const rows = Array.from({ length: 1200 }, (_, i) => ({
      'Client Name': `Client ${i}`,
      'E-mail': `client${i}@example.com`,
      'Receipt Number': i % 3 === 0 ? `MSC2190123${String(i).padStart(3, '0')}` : '',
    }));
    const sheet: ParsedSpreadsheet = {
      id: 'large',
      fileName: 'clients.csv',
      sheetName: 'Clients',
      headers: ['Client Name', 'E-mail', 'Receipt Number'],
      rows,
      rowCount: rows.length,
      sourceFormat: 'csv',
    };
    const mappings = [{
      spreadsheetId: 'large',
      sheetName: 'Clients',
      mappings: mapSpreadsheetColumns(sheet.headers),
    }];
    const start = Date.now();
    const preview = buildPreviewFromSpreadsheets([sheet], mappings);
    const elapsed = Date.now() - start;
    assert.equal(preview.clients.length, 1200);
    assert.ok(elapsed < 5000, `Expected < 5s, took ${elapsed}ms`);
    assert.equal(preview.totalRows, 1200);
  });
});
