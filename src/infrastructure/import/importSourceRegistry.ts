import type { IImportSourceProvider } from '../../domain/import/IImportSourceProvider';
import { spreadsheetImportProvider } from './providers/spreadsheetImportProvider';

const providers: IImportSourceProvider[] = [spreadsheetImportProvider];

export function registerImportSourceProvider(provider: IImportSourceProvider): void {
  const idx = providers.findIndex((p) => p.id === provider.id);
  if (idx >= 0) providers[idx] = provider;
  else providers.push(provider);
}

export function getImportSourceProvider(fileName: string, mimeType?: string): IImportSourceProvider | null {
  return providers.find((p) => p.canParse(fileName, mimeType)) ?? null;
}

export function getAllImportSourceProviders(): IImportSourceProvider[] {
  return [...providers];
}
