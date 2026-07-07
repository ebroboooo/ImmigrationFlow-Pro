import type { IFileValidator, FileValidationResult } from '../../../domain/ai/services';
import { aiConfig } from '../aiConfig';

const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'js', 'html', 'zip', 'rar'];

export class FileValidatorService implements IFileValidator {
  validate(file: File): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (file.size === 0) errors.push('The file is empty.');
    if (file.size > aiConfig.maxUploadBytes) {
      errors.push(`File exceeds maximum size of ${Math.round(aiConfig.maxUploadBytes / 1024 / 1024)} MB.`);
    }
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      errors.push('This file type is not allowed for security reasons.');
    }
    if (!aiConfig.allowedExtensions.includes(ext as typeof aiConfig.allowedExtensions[number])) {
      warnings.push('Uncommon file extension. Processing may require OCR or LLM provider.');
    }
    if (file.type && !aiConfig.allowedMimeTypes.includes(file.type as typeof aiConfig.allowedMimeTypes[number])) {
      warnings.push('File type may require OCR provider for text extraction.');
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

export const fileValidatorService = new FileValidatorService();
