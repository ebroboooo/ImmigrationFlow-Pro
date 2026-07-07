import type { CRMMatchCandidate, CRMMatchSuggestion } from '../../domain/ai/DocumentIntelligence';
import type { CaseEntity, PersonEntity } from '../../domain/ai/DocumentIntelligence';
import { normalizeReceiptNumber } from '../../domain/uscis/receiptValidator';
import { mockRepositories } from '../../infrastructure/repositories/MockRepositoryFactory';

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

export interface CRMMatchingInput {
  tenantId: string;
  caseEntity: CaseEntity;
  persons: PersonEntity[];
}

export async function findCRMMatches(input: CRMMatchingInput): Promise<CRMMatchSuggestion> {
  const candidates: CRMMatchCandidate[] = [];
  const { tenantId, caseEntity, persons } = input;

  const clients = await mockRepositories.clients.getAll(tenantId);
  const cases = await mockRepositories.cases.getAll(tenantId);

  const receipt = caseEntity.receiptNumber?.value;
  if (receipt) {
    const normalized = normalizeReceiptNumber(receipt);
    for (const c of cases) {
      if (c.uscisReceiptNumber && normalizeReceiptNumber(c.uscisReceiptNumber) === normalized) {
        const client = clients.find((cl) => cl.id === c.clientId);
        candidates.push({
          entityType: 'case',
          entityId: c.id,
          entityName: c.name,
          matchedOn: ['receiptNumber'],
          similarity: 1,
        });
        if (client) {
          candidates.push({
            entityType: 'client',
            entityId: client.id,
            entityName: client.name,
            matchedOn: ['receiptNumber (via case)'],
            similarity: 0.95,
          });
        }
      }
    }
  }

  const aNumber = caseEntity.aNumber?.value?.replace(/\D/g, '');
  if (aNumber) {
    for (const cl of clients) {
      if (cl.aNumber?.replace(/\D/g, '') === aNumber) {
        candidates.push({
          entityType: 'client',
          entityId: cl.id,
          entityName: cl.name,
          matchedOn: ['aNumber'],
          similarity: 0.98,
        });
      }
    }
  }

  for (const person of persons) {
    const email = person.email?.value?.trim().toLowerCase();
    const phone = person.phone?.value?.replace(/\D/g, '');
    const name = person.name?.value;

    if (email) {
      for (const cl of clients) {
        if (cl.email?.trim().toLowerCase() === email) {
          candidates.push({
            entityType: 'client',
            entityId: cl.id,
            entityName: cl.name,
            matchedOn: ['email'],
            similarity: 0.92,
          });
        }
      }
    }

    if (phone && phone.length >= 7) {
      for (const cl of clients) {
        const clPhone = cl.phone?.replace(/\D/g, '') ?? '';
        if (clPhone && (clPhone.endsWith(phone.slice(-7)) || phone.endsWith(clPhone.slice(-7)))) {
          candidates.push({
            entityType: 'client',
            entityId: cl.id,
            entityName: cl.name,
            matchedOn: ['phone'],
            similarity: 0.85,
          });
        }
      }
    }

    if (name) {
      for (const cl of clients) {
        const sim = nameSimilarity(name, cl.name);
        if (sim >= 0.7) {
          candidates.push({
            entityType: 'client',
            entityId: cl.id,
            entityName: cl.name,
            matchedOn: [`name similarity (${Math.round(sim * 100)}%)`],
            similarity: sim,
          });
        }
      }
      for (const c of cases) {
        const sim = nameSimilarity(name, c.name);
        if (sim >= 0.75) {
          candidates.push({
            entityType: 'case',
            entityId: c.id,
            entityName: c.name,
            matchedOn: [`case name similarity (${Math.round(sim * 100)}%)`],
            similarity: sim,
          });
        }
      }
    }
  }

  const deduped = dedupeCandidates(candidates);
  return buildSuggestion(deduped);
}

function dedupeCandidates(candidates: CRMMatchCandidate[]): CRMMatchCandidate[] {
  const map = new Map<string, CRMMatchCandidate>();
  for (const c of candidates) {
    const key = `${c.entityType}:${c.entityId}`;
    const existing = map.get(key);
    if (!existing || c.similarity > existing.similarity) {
      const mergedOn = existing
        ? [...new Set([...existing.matchedOn, ...c.matchedOn])]
        : c.matchedOn;
      map.set(key, { ...c, matchedOn: mergedOn, similarity: Math.max(existing?.similarity ?? 0, c.similarity) });
    }
  }
  return [...map.values()].sort((a, b) => b.similarity - a.similarity);
}

function buildSuggestion(candidates: CRMMatchCandidate[]): CRMMatchSuggestion {
  if (candidates.length === 0) {
    return {
      action: 'create_new_case',
      confidence: 0.6,
      reason: 'No matching client or case found in CRM. Consider creating a new case.',
      candidates: [],
      neverAutoApply: true,
    };
  }

  const top = candidates[0];
  const hasCaseMatch = candidates.some((c) => c.entityType === 'case' && c.similarity >= 0.9);
  const hasMultipleStrong = candidates.filter((c) => c.similarity >= 0.85).length > 1;

  if (hasMultipleStrong) {
    return {
      action: 'manual_review',
      confidence: 0.75,
      reason: 'Multiple CRM records match extracted data. Manual review recommended before updating.',
      candidates: candidates.slice(0, 5),
      neverAutoApply: true,
    };
  }

  if (hasCaseMatch) {
    return {
      action: 'update_existing_case',
      confidence: top.similarity,
      reason: `Strong match found for case "${top.entityName}" via ${top.matchedOn.join(', ')}. Suggest updating existing case — never auto-overwrite.`,
      candidates: candidates.slice(0, 5),
      neverAutoApply: true,
    };
  }

  if (top.entityType === 'client' && top.similarity >= 0.85) {
    return {
      action: 'merge',
      confidence: top.similarity,
      reason: `Client "${top.entityName}" matches via ${top.matchedOn.join(', ')}. Consider linking document to existing client or creating new case.`,
      candidates: candidates.slice(0, 5),
      neverAutoApply: true,
    };
  }

  return {
    action: 'manual_review',
    confidence: top.similarity,
    reason: `Partial match found (${Math.round(top.similarity * 100)}% confidence). Review before applying changes.`,
    candidates: candidates.slice(0, 5),
    neverAutoApply: true,
  };
}
