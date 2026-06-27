import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '../../lib/constants';

export interface AppSettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  language: string;
  currency: string;
  timezone: string;
  rtl: boolean;
  repositoryEngine: 'mock' | 'firebase';
}

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Smith & Associates Immigration Law',
  address: '1200 K Street NW, Suite 400, Washington, DC 20005',
  phone: '+1 (202) 555-0198',
  email: 'contact@smithimmigration.com',
  language: 'en',
  currency: 'USD',
  timezone: 'America/New_York',
  rtl: false,
  repositoryEngine: 'mock',
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  saveSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.settings);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    document.documentElement.dir = settings.rtl ? 'rtl' : 'ltr';
  }, [settings.rtl]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
