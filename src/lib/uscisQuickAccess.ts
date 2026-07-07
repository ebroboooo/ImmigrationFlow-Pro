import { STORAGE_KEYS } from './constants';
import { normalizeReceiptNumber } from '../domain/uscis/receiptValidator';

export const OFFICIAL_USCIS_CASE_STATUS_URL = 'https://egov.uscis.gov/casestatus/landing.do';

export function normalizeReceiptForClipboard(input: string): string {
  return normalizeReceiptNumber(input);
}

export type ClipboardCopyResult = 'copied' | 'manual';

export async function copyReceiptToClipboard(
  receipt: string,
  inputElement?: HTMLInputElement | null,
): Promise<ClipboardCopyResult> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(receipt);
      return 'copied';
    } catch {
      // fall through to manual selection
    }
  }

  if (inputElement) {
    inputElement.focus();
    inputElement.select();
    inputElement.setSelectionRange(0, receipt.length);
  }

  return 'manual';
}

export function openOfficialUscisSite(): void {
  window.open(OFFICIAL_USCIS_CASE_STATUS_URL, '_blank', 'noopener,noreferrer');
}

export function getRecentUscisReceipt(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.uscisRecentReceipt);
  } catch {
    return null;
  }
}

export function saveRecentUscisReceipt(receipt: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.uscisRecentReceipt, receipt);
  } catch {
    // ignore quota errors
  }
}

export async function copyAndOpenOfficialUscis(
  receipt: string,
  inputElement?: HTMLInputElement | null,
): Promise<ClipboardCopyResult> {
  const result = await copyReceiptToClipboard(receipt, inputElement);
  saveRecentUscisReceipt(receipt);
  openOfficialUscisSite();
  return result;
}
