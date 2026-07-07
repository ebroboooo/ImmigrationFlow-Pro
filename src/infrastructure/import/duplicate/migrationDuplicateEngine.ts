import { normalizeReceiptNumber } from '../../../domain/uscis/receiptValidator';
import type {
  DuplicateAction,
  DuplicateCandidate,
  MigrationPreview,
  PreviewCase,
  PreviewClient,
  PreviewLead,
} from '../../../domain/import/MigrationTypes';
import type { Client } from '../../../domain/models/CRM';
import type { Case } from '../../../domain/models/Sales';

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const partsA = new Set(na.split(' '));
  const partsB = new Set(nb.split(' '));
  let overlap = 0;
  for (const p of partsA) {
    if (partsB.has(p)) overlap++;
  }
  return overlap / Math.max(partsA.size, partsB.size);
}

function suggestAction(similarity: number, exactMatch: boolean): DuplicateAction {
  if (exactMatch || similarity >= 0.98) return 'update_existing';
  if (similarity >= 0.85) return 'merge';
  if (similarity >= 0.7) return 'skip';
  return 'create_new';
}

function findClientDuplicates(
  preview: PreviewClient,
  existingClients: Client[],
  seenInImport: Map<string, PreviewClient>,
): DuplicateCandidate[] {
  const results: DuplicateCandidate[] = [];

  for (const [key, other] of seenInImport) {
    if (key === preview.key) continue;
    if (preview.email && other.email && preview.email.toLowerCase() === other.email.toLowerCase()) {
      results.push({
        id: `dup-${preview.key}-import-email`,
        entityType: 'client',
        previewKey: preview.key,
        previewLabel: preview.name,
        matchedOn: ['email (within import)'],
        similarity: 1,
        suggestedAction: 'skip',
      });
    }
    const sim = nameSimilarity(preview.name, other.name);
    if (sim >= 0.95) {
      results.push({
        id: `dup-${preview.key}-import-name`,
        entityType: 'client',
        previewKey: preview.key,
        previewLabel: preview.name,
        matchedOn: [`name similarity within import (${Math.round(sim * 100)}%)`],
        similarity: sim,
        suggestedAction: 'merge',
      });
    }
  }

  for (const existing of existingClients) {
    const matchedOn: string[] = [];
    let similarity = 0;

    if (preview.email && existing.email && preview.email.toLowerCase() === existing.email.toLowerCase()) {
      matchedOn.push('email');
      similarity = Math.max(similarity, 0.98);
    }
    if (preview.phone && existing.phone) {
      const d1 = preview.phone.replace(/\D/g, '');
      const d2 = existing.phone.replace(/\D/g, '');
      if (d1.length >= 7 && d2.length >= 7 && (d1.endsWith(d2.slice(-7)) || d2.endsWith(d1.slice(-7)))) {
        matchedOn.push('phone');
        similarity = Math.max(similarity, 0.9);
      }
    }
    if (preview.aNumber && existing.aNumber && preview.aNumber.replace(/\D/g, '') === existing.aNumber.replace(/\D/g, '')) {
      matchedOn.push('aNumber');
      similarity = Math.max(similarity, 0.99);
    }
    const nameSim = nameSimilarity(preview.name, existing.name);
    if (nameSim >= 0.85) {
      matchedOn.push(`name (${Math.round(nameSim * 100)}%)`);
      similarity = Math.max(similarity, nameSim);
    }

    if (matchedOn.length > 0) {
      results.push({
        id: `dup-${preview.key}-crm-${existing.id}`,
        entityType: 'client',
        previewKey: preview.key,
        previewLabel: preview.name,
        matchedOn,
        similarity,
        existingId: existing.id,
        existingLabel: existing.name,
        suggestedAction: suggestAction(similarity, normalizeName(preview.name) === normalizeName(existing.name)),
      });
    }
  }

  return results;
}

function findCaseDuplicates(preview: PreviewCase, existingCases: Case[]): DuplicateCandidate[] {
  const results: DuplicateCandidate[] = [];
  if (!preview.uscisReceiptNumber) return results;
  const normalized = normalizeReceiptNumber(preview.uscisReceiptNumber);
  for (const existing of existingCases) {
    if (existing.uscisReceiptNumber && normalizeReceiptNumber(existing.uscisReceiptNumber) === normalized) {
      results.push({
        id: `dup-${preview.key}-case-${existing.id}`,
        entityType: 'case',
        previewKey: preview.key,
        previewLabel: preview.name,
        matchedOn: ['receiptNumber'],
        similarity: 1,
        existingId: existing.id,
        existingLabel: existing.name,
        suggestedAction: 'update_existing',
      });
    }
  }
  return results;
}

function findLeadDuplicates(preview: PreviewLead, existingLeads: Array<{ id: string; name: string; email?: string; phone?: string }>): DuplicateCandidate[] {
  const results: DuplicateCandidate[] = [];
  for (const existing of existingLeads) {
    const matchedOn: string[] = [];
    let similarity = 0;
    if (preview.email && existing.email && preview.email.toLowerCase() === existing.email.toLowerCase()) {
      matchedOn.push('email');
      similarity = 0.98;
    }
    const sim = nameSimilarity(preview.name, existing.name);
    if (sim >= 0.9) {
      matchedOn.push(`name (${Math.round(sim * 100)}%)`);
      similarity = Math.max(similarity, sim);
    }
    if (matchedOn.length > 0) {
      results.push({
        id: `dup-${preview.key}-lead-${existing.id}`,
        entityType: 'lead',
        previewKey: preview.key,
        previewLabel: preview.name,
        matchedOn,
        similarity,
        existingId: existing.id,
        existingLabel: existing.name,
        suggestedAction: suggestAction(similarity, sim >= 0.98),
      });
    }
  }
  return results;
}

export interface DuplicateDetectionInput {
  preview: MigrationPreview;
  existingClients: Client[];
  existingCases: Case[];
  existingLeads: Array<{ id: string; name: string; email?: string; phone?: string }>;
}

export function detectMigrationDuplicates(input: DuplicateDetectionInput): DuplicateCandidate[] {
  const { preview, existingClients, existingCases, existingLeads } = input;
  const duplicates: DuplicateCandidate[] = [];
  const seenClients = new Map<string, PreviewClient>();

  for (const client of preview.clients) {
    duplicates.push(...findClientDuplicates(client, existingClients, seenClients));
    seenClients.set(client.key, client);
    if (duplicates.some((d) => d.previewKey === client.key)) {
      client.isDuplicate = true;
    }
  }

  for (const c of preview.cases) {
    duplicates.push(...findCaseDuplicates(c, existingCases));
    if (duplicates.some((d) => d.previewKey === c.key)) c.isDuplicate = true;
  }

  for (const lead of preview.leads) {
    duplicates.push(...findLeadDuplicates(lead, existingLeads));
    if (duplicates.some((d) => d.previewKey === lead.key)) lead.isDuplicate = true;
  }

  const deduped = new Map<string, DuplicateCandidate>();
  for (const d of duplicates) {
    const key = `${d.entityType}:${d.previewKey}:${d.existingId ?? 'import'}`;
    const existing = deduped.get(key);
    if (!existing || d.similarity > existing.similarity) deduped.set(key, d);
  }

  return [...deduped.values()].sort((a, b) => b.similarity - a.similarity);
}

export function applyDuplicateResolutions(
  preview: MigrationPreview,
  duplicates: DuplicateCandidate[],
): MigrationPreview {
  const updated = { ...preview, clients: [...preview.clients], cases: [...preview.cases], leads: [...preview.leads] };

  for (const dup of duplicates) {
    const action = dup.resolvedAction ?? dup.suggestedAction;
    if (dup.entityType === 'client') {
      const idx = updated.clients.findIndex((c) => c.key === dup.previewKey);
      if (idx >= 0) {
        updated.clients[idx] = { ...updated.clients[idx], isDuplicate: true, duplicateAction: action, existingId: dup.existingId };
      }
    } else if (dup.entityType === 'case') {
      const idx = updated.cases.findIndex((c) => c.key === dup.previewKey);
      if (idx >= 0) {
        updated.cases[idx] = { ...updated.cases[idx], isDuplicate: true, duplicateAction: action, existingId: dup.existingId };
      }
    } else if (dup.entityType === 'lead') {
      const idx = updated.leads.findIndex((l) => l.key === dup.previewKey);
      if (idx >= 0) {
        updated.leads[idx] = { ...updated.leads[idx], isDuplicate: true, duplicateAction: action, existingId: dup.existingId };
      }
    }
  }

  return updated;
}
