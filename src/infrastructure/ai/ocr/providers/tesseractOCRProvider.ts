import Tesseract from 'tesseract.js';
import type { IOCRProvider, OCRResult, OCRExtractOptions } from '../../../../domain/ai/services';
import { loadAISettings } from '../../settings/aiSettingsStorage';
import { cleanupOcrText } from '../ocrTextCleanup';
import { detectNativePdfText, isLikelyNativeText } from '../../extraction/nativePdfTextDetector';
import { loadPdfDocument, renderPdfPageToCanvas } from '../pdfJsLoader';
import {
  computeOcrAverages,
  recordOcrUsage,
  updateOcrProviderHealth,
} from '../../telemetry/ocrUsageTelemetry';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/tiff'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'];

export class TesseractOCRProvider implements IOCRProvider {
  readonly id = 'tesseract';
  readonly name = 'Tesseract.js (Local)';
  readonly supportedMimeTypes = ['application/pdf', ...IMAGE_TYPES] as const;
  readonly supportedExtensions = ['pdf', ...IMAGE_EXT] as const;

  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  isConfigured(): boolean {
    const settings = loadAISettings();
    return settings.ocrEnabled && settings.ocrDefaultProvider === 'tesseract';
  }

  supports(mimeType: string, fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return (
      this.supportedMimeTypes.includes(mimeType)
      || this.supportedExtensions.includes(ext)
      || mimeType === 'application/octet-stream'
    );
  }

  async testConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      const worker = await Tesseract.createWorker('eng', undefined, { logger: () => {} });
      await worker.recognize(await this.createTestCanvas());
      await worker.terminate();
      return { success: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Tesseract test failed',
      };
    }
  }

  private async createTestCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 120, 40);
    ctx.fillStyle = '#000';
    ctx.font = '16px sans-serif';
    ctx.fillText('OCR OK', 10, 25);
    return canvas;
  }

  async extractText(file: Blob, mimeType: string, options?: OCRExtractOptions): Promise<OCRResult> {
    const start = Date.now();
    const warnings: string[] = [];
    const fileName = options?.fileName ?? 'document';
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const isPdf = mimeType === 'application/pdf' || ext === 'pdf';

    options?.onProgress?.({ currentPage: 0, totalPages: 1, stage: 'detecting', message: 'Analyzing document…' });

    if (isPdf) {
      return this.extractPdf(file, options, start, warnings);
    }

    return this.extractImage(file, options, start, warnings);
  }

  private async extractPdf(
    file: Blob,
    options: OCRExtractOptions | undefined,
    start: number,
    warnings: string[],
  ): Promise<OCRResult> {
    const detection = await detectNativePdfText(file, loadPdfDocument);
    if (isLikelyNativeText(detection)) {
      const text = cleanupOcrText(detection.text);
      const result: OCRResult = {
        text,
        confidence: 0.98,
        providerId: this.id,
        pageCount: detection.pageCount,
        processingTimeMs: Date.now() - start,
        warnings: ['Native PDF text detected — OCR skipped.'],
        method: 'native_pdf',
      };
      this.recordSuccess(result, options?.fileName);
      return result;
    }

    const buffer = await file.arrayBuffer();
    const pdf = await loadPdfDocument(buffer);
    const pageCount = pdf.numPages;
    const worker = await Tesseract.createWorker('eng', undefined, { logger: () => {} });
    const pageTexts: string[] = [];
    let confidenceSum = 0;

    try {
      for (let page = 1; page <= pageCount; page++) {
        if (options?.signal?.aborted) throw new Error('OCR cancelled.');
        options?.onProgress?.({
          currentPage: page,
          totalPages: pageCount,
          stage: 'ocr',
          message: `Reading page ${page} of ${pageCount}…`,
        });
        const canvas = await renderPdfPageToCanvas(pdf, page);
        const { data } = await worker.recognize(canvas);
        pageTexts.push(data.text);
        confidenceSum += data.confidence;
      }
    } finally {
      await worker.terminate();
    }

    options?.onProgress?.({ currentPage: pageCount, totalPages: pageCount, stage: 'cleanup', message: 'Cleaning text…' });
    const rawText = pageTexts.join('\n\n--- Page Break ---\n\n');
    const text = cleanupOcrText(rawText);
    const avgConfidence = pageCount > 0 ? confidenceSum / pageCount / 100 : 0;

    const result: OCRResult = {
      text,
      confidence: avgConfidence,
      providerId: this.id,
      pageCount,
      processingTimeMs: Date.now() - start,
      warnings,
      method: 'ocr',
      language: 'eng',
    };
    this.recordSuccess(result, options?.fileName);
    options?.onProgress?.({
      currentPage: pageCount,
      totalPages: pageCount,
      stage: 'complete',
      confidence: avgConfidence,
    });
    return result;
  }

  private async extractImage(
    file: Blob,
    options: OCRExtractOptions | undefined,
    start: number,
    warnings: string[],
  ): Promise<OCRResult> {
    if (options?.signal?.aborted) throw new Error('OCR cancelled.');
    options?.onProgress?.({ currentPage: 1, totalPages: 1, stage: 'ocr', message: 'Reading image…' });

    const worker = await Tesseract.createWorker('eng', undefined, { logger: () => {} });
    try {
      const { data } = await worker.recognize(file);
      options?.onProgress?.({ currentPage: 1, totalPages: 1, stage: 'cleanup' });
      const text = cleanupOcrText(data.text);
      const result: OCRResult = {
        text,
        confidence: data.confidence / 100,
        providerId: this.id,
        pageCount: 1,
        processingTimeMs: Date.now() - start,
        warnings,
        method: 'ocr',
        language: 'eng',
      };
      this.recordSuccess(result, options?.fileName);
      options?.onProgress?.({ currentPage: 1, totalPages: 1, stage: 'complete', confidence: result.confidence });
      return result;
    } finally {
      await worker.terminate();
    }
  }

  private recordSuccess(result: OCRResult, fileName?: string): void {
    recordOcrUsage({
      providerId: this.id,
      fileName,
      pageCount: result.pageCount,
      processingTimeMs: result.processingTimeMs,
      confidence: result.confidence,
      warnings: result.warnings,
      fallbackUsed: false,
      fromCache: Boolean(result.fromCache),
      timestamp: new Date().toISOString(),
    });
    const avgs = computeOcrAverages(this.id);
    updateOcrProviderHealth({
      providerId: this.id,
      configured: true,
      enabled: loadAISettings().ocrEnabled,
      lastSuccessfulCall: new Date().toISOString(),
      lastLatencyMs: result.processingTimeMs,
      averageConfidence: avgs.avgConfidence,
      averageProcessingTimeMs: avgs.avgTimeMs,
      lastError: undefined,
    });
  }
}

export const tesseractOCRProvider = new TesseractOCRProvider();
