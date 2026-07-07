import JSZip from 'jszip';
import type { IDocumentArchiveProvider, ImportParseOptions } from '../../../domain/import/IImportSourceProvider';

const DOCUMENT_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff', 'doc', 'docx'];

export class ZipDocumentArchiveProvider implements IDocumentArchiveProvider {
  readonly id = 'zip';
  readonly name = 'ZIP Document Archive';
  readonly supportedExtensions = ['zip'] as const;

  canParse(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.zip');
  }

  async extract(
    file: Blob,
    _fileName: string,
    options?: ImportParseOptions,
  ): Promise<Array<{ path: string; fileName: string; size: number; blob: Blob }>> {
    options?.onProgress?.('Extracting ZIP archive…', 10);
    const zip = await JSZip.loadAsync(file);
    const entries: Array<{ path: string; fileName: string; size: number; blob: Blob }> = [];
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    let idx = 0;

    for (const path of names) {
      if (options?.signal?.aborted) throw new Error('ZIP extraction cancelled.');
      const entry = zip.files[path];
      const ext = path.split('.').pop()?.toLowerCase() ?? '';
      if (!DOCUMENT_EXTENSIONS.includes(ext)) continue;
      const blob = await entry.async('blob');
      const fileName = path.split('/').pop() ?? path;
      entries.push({ path, fileName, size: blob.size, blob });
      idx += 1;
      options?.onProgress?.(`Extracted ${fileName}`, 10 + Math.round((idx / names.length) * 85));
    }

    options?.onProgress?.('ZIP extraction complete', 100);
    return entries;
  }
}

export const zipDocumentArchiveProvider = new ZipDocumentArchiveProvider();
