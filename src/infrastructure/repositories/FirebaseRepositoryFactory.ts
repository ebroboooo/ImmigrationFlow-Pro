import type { IUnitOfWork } from '../../domain/repositories/IRepository';

/**
 * Firebase repository adapter stub.
 * Wire Firebase SDK and implement IUnitOfWork interfaces before enabling in RepositoryContext.
 */
export function createFirebaseRepositories(_config: {
  apiKey: string;
  projectId: string;
  authDomain?: string;
}): IUnitOfWork {
  throw new Error(
    'Firebase repositories are not configured. Add Firebase SDK credentials in Settings and implement adapters.'
  );
}
