import type { TextExtractionResult, OCRExtractOptions } from '../../../domain/ai/services';
import type { IntakeOCRMetadata } from '../../../domain/ai/OCRUsage';
import { plainTextExtractor } from './plainTextExtractor';
import { ocrProviderManager } from '../ocr/ocrProviderManager';
import { cleanupOcrText } from '../ocr/ocrTextCleanup';

export interface DocumentTextExtractionInput {
  file: Blob;
  fileName: string;
  mimeType: string;
  storageKey: string;
  options?: OCRExtractOptions;
}

export interface DocumentTextExtractionOutput {
  text: string;
  extraction: TextExtractionResult;
  ocrMetadata: IntakeOCRMetadata;
  ocrRequired: boolean;
  ocrAvailable: boolean;
}

function isOcrCandidate(mimeType: string, fileName: string): boolean {
  if (plainTextExtractor.canExtract(mimeType, fileName)) return false;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return (
    mimeType === 'application/pdf'
    || mimeType.startsWith('image/')
    || ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'].includes(ext)
  );
}

export async function extractDocumentText(input: DocumentTextExtractionInput): Promise<DocumentTextExtractionOutput> {
  const { file, fileName, mimeType, storageKey, options } = input;
  const ocrAvailable = ocrProviderManager.isOcrConfigured();

  if (plainTextExtractor.canExtract(mimeType, fileName)) {
    const result = await plainTextExtractor.extract(file, fileName, mimeType);
    const text = cleanupOcrText(result.text);
    return {
      text,
      extraction: { ...result, text },
      ocrRequired: false,
      ocrAvailable,
      ocrMetadata: {
        method: 'plain_text',
        warnings: [],
        skippedOcr: true,
      },
    };
  }

  if (!isOcrCandidate(mimeType, fileName)) {
    return {
      text: '',
      extraction: { text: '', method: 'plain_text', complete: false },
      ocrRequired: false,
      ocrAvailable,
      ocrMetadata: { method: 'none', warnings: ['Unsupported file type for text extraction.'] },
    };
  }

  if (!ocrAvailable) {
    return {
      text: '',
      extraction: { text: '', method: 'ocr', complete: false },
      ocrRequired: true,
      ocrAvailable: false,
      ocrMetadata: {
        method: 'none',
        warnings: ['OCR provider not configured for scanned documents.'],
      },
    };
  }

  try {
    const ocrResult = await ocrProviderManager.extractText(file, mimeType, {
      ...options,
      fileName,
      storageKey,
      fileSize: file.size,
    });

    const skippedOcr = ocrResult.method === 'native_pdf';
    const text = cleanupOcrText(ocrResult.text);

    return {
      text,
      extraction: {
        text,
        method: ocrResult.method === 'native_pdf' ? 'plain_text' : 'ocr',
        complete: Boolean(text),
      },
      ocrRequired: true,
      ocrAvailable: true,
      ocrMetadata: {
        providerId: ocrResult.providerId,
        method: ocrResult.method === 'native_pdf' ? 'native_pdf' : 'ocr',
        pageCount: ocrResult.pageCount,
        confidence: ocrResult.confidence,
        processingTimeMs: ocrResult.processingTimeMs,
        warnings: ocrResult.warnings,
        fromCache: ocrResult.fromCache,
        fallbackUsed: ocrResult.fallbackUsed,
        skippedOcr,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR failed';
    return {
      text: '',
      extraction: { text: '', method: 'ocr', complete: false },
      ocrRequired: true,
      ocrAvailable: true,
      ocrMetadata: {
        method: 'none',
        warnings: [message],
      },
    };
  }
}
