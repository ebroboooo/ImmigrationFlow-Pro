import { reloadAllMockRepositories } from '../../repositories/MockRepositoryFactory';
import { createStorageSnapshot, restoreStorageSnapshot } from './migrationSnapshot';

export type { StorageSnapshot } from './migrationSnapshot';
export { createStorageSnapshot, restoreStorageSnapshot };

export function reloadRepositoriesAfterRollback(): void {
  reloadAllMockRepositories();
  window.dispatchEvent(new CustomEvent('crm-data-restored'));
}
