import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { IUnitOfWork } from '../../domain/repositories/IRepository';
import { mockRepositories } from '../../infrastructure/repositories/MockRepositoryFactory';

const RepositoryContext = createContext<IUnitOfWork | undefined>(undefined);

export const RepositoryProvider = ({ children }: { children: ReactNode }) => {
  // Swap mockRepositories with createFirebaseRepositories(config) when Firebase is configured.
  return (
    <RepositoryContext.Provider value={mockRepositories}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepositories = (): IUnitOfWork => {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useRepositories must be used within a RepositoryProvider');
  return context;
};
