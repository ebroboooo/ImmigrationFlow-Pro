import { generateId } from '../../../lib/utils';
import type { MigrationPreview, PreviewClient, ZipDocumentEntry } from '../../../domain/import/MigrationTypes';

const DOC_TYPE_PATTERNS: Array<{ pattern: RegExp; type: string; category: string }> = [
  { pattern: /passport/i, type: 'passport', category: 'Passport' },
  { pattern: /visa/i, type: 'visa', category: 'Other' },
  { pattern: /i-?797/i, type: 'i797', category: 'USCIS Notices' },
  { pattern: /marriage/i, type: 'marriage', category: 'Marriage Certificate' },
  { pattern: /birth/i, type: 'birth', category: 'Birth Certificate' },
  { pattern: /tax/i, type: 'tax', category: 'Tax Returns' },
  { pattern: /rfe/i, type: 'rfe', category: 'USCIS Notices' },
  { pattern: /ead/i, type: 'ead', category: 'Evidence' },
  { pattern: /green\s*card/i, type: 'greencard', category: 'Evidence' },
  { pattern: /court/i, type: 'court', category: 'Court Documents' },
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function nameInPath(path: string, clientName: string): number {
  const normPath = normalizeName(path);
  const parts = normalizeName(clientName).split(' ').filter(Boolean);
  if (parts.length === 0) return 0;
  let hits = 0;
  for (const p of parts) {
    if (p.length >= 3 && normPath.includes(p)) hits++;
  }
  return hits / parts.length;
}

function extractReceiptFromName(name: string): string | undefined {
  const match = name.match(/[A-Z]{3}\d{10}/i);
  return match?.[0]?.toUpperCase();
}

function extractANumberFromName(name: string): string | undefined {
  const match = name.match(/A-?\d{8,9}/i);
  return match?.[0];
}

export function linkDocumentsToEntities(
  zipEntries: Array<{ path: string; fileName: string; size: number; blob: Blob }>,
  preview: MigrationPreview,
): ZipDocumentEntry[] {
  return zipEntries.map((entry) => {
    const fullPath = entry.path;
    let detectedType = 'unknown';
    for (const { pattern, type } of DOC_TYPE_PATTERNS) {
      if (pattern.test(fullPath)) {
        detectedType = type;
        break;
      }
    }

    const suggestedReceipt = extractReceiptFromName(fullPath);
    const suggestedANumber = extractANumberFromName(fullPath);

    let bestClient: PreviewClient | null = null;
    let bestScore = 0;
    for (const client of preview.clients) {
      const score = nameInPath(fullPath, client.name);
      if (score > bestScore) {
        bestScore = score;
        bestClient = client;
      }
    }

    let linkedCaseKey: string | undefined;
    if (suggestedReceipt) {
      const match = preview.cases.find((c) => c.uscisReceiptNumber?.toUpperCase() === suggestedReceipt);
      if (match) linkedCaseKey = match.key;
    }

    const linkConfidence = Math.min(0.98, Math.max(
      bestScore * 0.7,
      suggestedReceipt ? 0.85 : 0,
      suggestedANumber ? 0.8 : 0,
      linkedCaseKey ? 0.9 : 0,
    ));

    return {
      id: generateId(),
      path: entry.path,
      fileName: entry.fileName,
      size: entry.size,
      blob: entry.blob,
      detectedType,
      suggestedClientName: bestClient?.name,
      suggestedReceiptNumber: suggestedReceipt,
      suggestedANumber,
      linkConfidence: Math.round(linkConfidence * 100) / 100,
      linkedEntityType: linkedCaseKey ? 'case' : bestClient ? 'client' : undefined,
      linkedEntityKey: linkedCaseKey ?? bestClient?.key,
    };
  });
}

export function buildPreviewDocumentsFromZip(
  zipDocs: ZipDocumentEntry[],
  preview: MigrationPreview,
): MigrationPreview {
  const documents = zipDocs.map((z) => ({
    key: z.id,
    name: z.fileName,
    clientKey: z.linkedEntityType === 'client' ? z.linkedEntityKey : undefined,
    caseKey: z.linkedEntityType === 'case' ? z.linkedEntityKey : undefined,
    category: DOC_TYPE_PATTERNS.find((p) => p.type === z.detectedType)?.category ?? 'Other',
    zipEntryId: z.id,
  }));
  return { ...preview, documents: [...preview.documents, ...documents] };
}
