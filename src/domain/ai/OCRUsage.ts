export interface OCRProgress {
  currentPage: number;
  totalPages: number;
  stage: 'detecting' | 'ocr' | 'cleanup' | 'complete';
  message?: string;
  confidence?: number;
}

export interface OCRUsageRecord {
  providerId: string;
  fileName?: string;
  pageCount: number;
  processingTimeMs: number;
  confidence: number;
  warnings: string[];
  fallbackUsed: boolean;
  fromCache: boolean;
  timestamp: string;
  error?: string;
}

export interface OCRProviderHealth {
  providerId: string;
  configured: boolean;
  enabled: boolean;
  lastSuccessfulCall?: string;
  lastError?: string;
  lastLatencyMs?: number;
  averageConfidence?: number;
  averageProcessingTimeMs?: number;
}

export interface IntakeOCRMetadata {
  providerId?: string;
  method: 'plain_text' | 'native_pdf' | 'ocr' | 'none';
  pageCount?: number;
  confidence?: number;
  processingTimeMs?: number;
  warnings: string[];
  fromCache?: boolean;
  fallbackUsed?: boolean;
  skippedOcr?: boolean;
  progress?: OCRProgress;
}
