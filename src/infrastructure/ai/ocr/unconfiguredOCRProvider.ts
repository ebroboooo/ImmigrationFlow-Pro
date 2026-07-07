import type { IOCRProvider, OCRResult, OCRExtractOptions } from '../../../domain/ai/services';

/** Extension point — register Google Vision, Azure, AWS Textract without changing business logic. */
export class UnconfiguredOCRProvider implements IOCRProvider {
  readonly id = 'unconfigured';
  readonly name = 'OCR (Not Configured)';
  readonly supportedMimeTypes = [] as const;
  readonly supportedExtensions = [] as const;

  isAvailable(): boolean {
    return false;
  }

  isConfigured(): boolean {
    return false;
  }

  supports(): boolean {
    return false;
  }

  async extractText(_file: Blob, _mimeType: string, _options?: OCRExtractOptions): Promise<OCRResult> {
    throw new Error(
      'OCR provider is not configured. Enable OCR in Settings → AI.',
    );
  }
}

export const unconfiguredOCRProvider = new UnconfiguredOCRProvider();
