import type { ITextExtractor, TextExtractionResult } from '../../../domain/ai/services';

export class PlainTextExtractor implements ITextExtractor {
  canExtract(mimeType: string, fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return mimeType === 'text/plain' || mimeType === 'application/json' || ext === 'txt' || ext === 'json';
  }

  async extract(file: Blob, _fileName?: string, _mimeType?: string): Promise<TextExtractionResult> {
    const text = await file.text();
    return { text, method: 'plain_text', complete: true };
  }
}

export const plainTextExtractor = new PlainTextExtractor();
