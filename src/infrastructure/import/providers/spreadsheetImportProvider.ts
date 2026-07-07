import * as XLSX from 'xlsx';
import { generateId } from '../../../lib/utils';
import type { IImportSourceProvider, ImportParseOptions } from '../../../domain/import/IImportSourceProvider';
import type { ParsedSpreadsheet } from '../../../domain/import/MigrationTypes';

function normalizeCell(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function sheetToRows(sheet: XLSX.WorkSheet): { headers: string[]; rows: Record<string, string>[] } {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (json.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = Object.keys(json[0] ?? {}).map((h) => h.trim()).filter(Boolean);
  const rows = json.map((row) => {
    const out: Record<string, string> = {};
    for (const h of headers) {
      out[h] = normalizeCell(row[h]);
    }
    return out;
  });
  return { headers, rows };
}

function detectFormat(fileName: string): ParsedSpreadsheet['sourceFormat'] {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'csv') return 'csv';
  if (ext === 'tsv' || ext === 'txt') return 'tsv';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  return 'unknown';
}

export class SpreadsheetImportProvider implements IImportSourceProvider {
  readonly id = 'spreadsheet';
  readonly name = 'Excel / CSV / TSV';
  readonly supportedExtensions = ['xlsx', 'xls', 'csv', 'tsv', 'txt'] as const;
  readonly supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/tab-separated-values',
    'text/plain',
  ] as const;

  canParse(fileName: string, mimeType?: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (this.supportedExtensions.includes(ext as typeof this.supportedExtensions[number])) return true;
    if (mimeType && this.supportedMimeTypes.some((m) => mimeType.includes(m.split('/')[1] ?? m))) return true;
    return false;
  }

  async parse(file: Blob, fileName: string, options?: ImportParseOptions): Promise<ParsedSpreadsheet[]> {
    options?.onProgress?.('Reading spreadsheet…', 10);
    const buffer = await file.arrayBuffer();
    const format = detectFormat(fileName);
    const readOpts: XLSX.ParsingOptions = { type: 'array', cellDates: true };
    if (format === 'csv') readOpts.raw = false;
    if (format === 'tsv') {
      const text = new TextDecoder().decode(buffer);
      const wb = XLSX.read(text, { ...readOpts, type: 'string', FS: '\t' });
      return this.workbookToSpreadsheets(wb, fileName, format, options);
    }
    const wb = XLSX.read(buffer, readOpts);
    return this.workbookToSpreadsheets(wb, fileName, format, options);
  }

  private workbookToSpreadsheets(
    wb: XLSX.WorkBook,
    fileName: string,
    format: ParsedSpreadsheet['sourceFormat'],
    options?: ImportParseOptions,
  ): ParsedSpreadsheet[] {
    const sheets = wb.SheetNames;
    const results: ParsedSpreadsheet[] = [];
    sheets.forEach((sheetName, idx) => {
      options?.onProgress?.(`Parsing sheet "${sheetName}"…`, 20 + Math.round((idx / sheets.length) * 60));
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;
      const { headers, rows } = sheetToRows(sheet);
      if (headers.length === 0) return;
      results.push({
        id: generateId(),
        fileName,
        sheetName,
        headers,
        rows,
        rowCount: rows.length,
        sourceFormat: format,
      });
    });
    options?.onProgress?.('Spreadsheet parsed', 100);
    return results;
  }
}

export const spreadsheetImportProvider = new SpreadsheetImportProvider();
