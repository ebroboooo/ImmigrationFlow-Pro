import type { ParsedSpreadsheet } from './MigrationTypes';

export interface ImportParseOptions {
  signal?: AbortSignal;
  onProgress?: (message: string, percent: number) => void;
}

/** Provider interface for future Clio, MyCase, PracticePanther, Filevine, etc. */
export interface IImportSourceProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedExtensions: readonly string[];
  readonly supportedMimeTypes: readonly string[];
  canParse(fileName: string, mimeType?: string): boolean;
  parse(file: Blob, fileName: string, options?: ImportParseOptions): Promise<ParsedSpreadsheet[]>;
}

export interface IDocumentArchiveProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedExtensions: readonly string[];
  canParse(fileName: string): boolean;
  extract(file: Blob, fileName: string, options?: ImportParseOptions): Promise<Array<{
    path: string;
    fileName: string;
    size: number;
    blob: Blob;
  }>>;
}
