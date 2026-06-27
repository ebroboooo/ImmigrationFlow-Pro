import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../../domain/models/User';
import { useRepositories } from './RepositoryContext';
import { ADMIN_EMAIL, LEGACY_ADMIN_EMAIL, STORAGE_KEYS } from '../../lib/constants';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  tenantId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { users } = useRepositories();

  useEffect(() => {
    const checkSession = async () => {
      const storedUserId = localStorage.getItem(STORAGE_KEYS.session);
      if (storedUserId) {
        try {
          const foundUser = await users.getById(storedUserId);
          if (foundUser) {
            setUser(foundUser);
          } else {
            localStorage.removeItem(STORAGE_KEYS.session);
          }
        } catch (e) {
          console.error('Session check failed', e);
        }
      }
      setLoading(false);
    };
    checkSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string) => {
    setLoading(true);
    try {
      let foundUser = await users.getByEmail(email);
      if (!foundUser && email === ADMIN_EMAIL) {
        foundUser = await users.getByEmail(LEGACY_ADMIN_EMAIL);
      }
      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem(STORAGE_KEYS.session, foundUser.id);
      } else {
        throw new Error(`User not found. Try ${ADMIN_EMAIL}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.session);
    localStorage.removeItem(STORAGE_KEYS.setupComplete);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      tenantId: user?.tenantId || 'tenant-demo-1',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
