import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useRepositories } from '../contexts/RepositoryContext';
import { useToast } from '../contexts/ToastContext';
import { seedDemoData, seedFreshData } from '../../infrastructure/seeders/DemoSeeder';
import { exportTenantData, downloadJson } from '../../lib/exportData';
import { importTenantData, parseImportFile } from '../../lib/importData';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Save, RefreshCw, Download, Upload, Trash2, Building2, Globe, Monitor, Users, Database, Bot } from 'lucide-react';
import { AiSettingsPanel } from '../components/settings/AiSettingsPanel';
import { cn } from '../../lib/utils';
import { design } from '../../lib/design';

type ConfirmAction = 'reset' | 'clear' | null;

export const Settings = () => {
  const { user, tenantId } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, saveSettings } = useSettings();
  const repos = useRepositories();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const handleSave = async () => {
    setLoading(true);
    saveSettings();
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    showToast('Your settings were saved successfully.');
  };

  const handleResetData = async () => {
    setLoading(true);
    try {
      await seedDemoData();
      showToast('Sample firm data loaded. Redirecting…', 'info');
      window.location.href = '/';
    } catch {
      showToast('Could not load sample data. Please try again.', 'error');
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    try {
      await seedFreshData();
      showToast('All data cleared. Starting fresh…', 'info');
      window.location.href = '/welcome';
    } catch {
      showToast('Could not clear data. Please try again.', 'error');
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportTenantData(repos, tenantId);
      downloadJson(data, `immigrationflow-export-${new Date().toISOString().slice(0, 10)}.json`);
      showToast('Your data backup was downloaded.');
    } catch {
      showToast('Export failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setLoading(true);
      try {
        const text = await file.text();
        const payload = parseImportFile(text);
        const count = await importTenantData(repos, tenantId, payload);
        showToast(`Restored ${count} records from your backup file.`);
        window.location.reload();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Import failed. Please check the file and try again.', 'error');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building2 },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'ai', label: 'AI', icon: Bot },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1">Manage your firm profile, preferences, and data.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className={cn(design.btn.primary, 'w-full sm:w-auto')}
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors min-h-12',
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 glass-card p-6 min-h-[500px]">
          {activeTab === 'business' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">Business Information</h2>
              <div className="grid gap-6 max-w-lg">
                {([
                  ['Company Name', 'companyName', 'text'],
                  ['Email Address', 'email', 'email'],
                  ['Phone Number', 'phone', 'tel'],
                ] as const).map(([label, key, type]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-base font-medium text-gray-700 dark:text-gray-300">{label}</label>
                    <input type={type} value={settings[key]} onChange={e => updateSettings({ [key]: e.target.value })}
                      className={design.input} />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300">Physical Address</label>
                  <textarea value={settings.address} onChange={e => updateSettings({ address: e.target.value })} rows={3}
                    className={design.input} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">Localization Preferences</h2>
              <div className="grid gap-6 max-w-lg">
                <div className="space-y-2">
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300">Language</label>
                  <select value={settings.language} onChange={e => updateSettings({ language: e.target.value })}
                    className={design.input}>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="ar">Arabic (RTL)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300">Currency</label>
                  <select value={settings.currency} onChange={e => updateSettings({ currency: e.target.value })}
                    className={design.input}>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                  <select value={settings.timezone} onChange={e => updateSettings({ timezone: e.target.value })}
                    className={design.input}>
                    <option value="America/New_York">Eastern (US)</option>
                    <option value="America/Chicago">Central (US)</option>
                    <option value="America/Los_Angeles">Pacific (US)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="rtl" checked={settings.rtl} onChange={e => updateSettings({ rtl: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <label htmlFor="rtl" className="text-base font-medium text-gray-700 dark:text-gray-300">Enable Right-to-Left (RTL) Layout</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">System Settings</h2>
              <div className="grid gap-6 max-w-lg">
                <div className="space-y-2">
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300">Display Theme</label>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setTheme('light')} className={cn('min-h-12 px-5 py-2 rounded-lg border text-base', theme === 'light' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>Light Mode</button>
                    <button type="button" onClick={() => setTheme('dark')} className={cn('min-h-12 px-5 py-2 rounded-lg border text-base', theme === 'dark' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>Dark Mode</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300">Data Storage</label>
                  <select disabled value={settings.repositoryEngine}
                    className="w-full min-h-12 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-base text-gray-500 dark:text-gray-400 cursor-not-allowed">
                    <option value="mock">Local Storage (Active)</option>
                    <option value="firebase">Cloud Storage (Requires Setup)</option>
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your firm data is stored securely on this device. Cloud sync is available when configured.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">User Management</h2>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-base text-gray-500">{user?.email}</p>
                </div>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider">{user?.role}</span>
              </div>
              <p className="text-base text-gray-500 dark:text-gray-400">Staff roles control access across all modules. Administrators have full access to firm data.</p>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">Data Management</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Export Data</h3>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-1">Download all firm data as a JSON backup file.</p>
                  </div>
                  <button type="button" onClick={handleExport} disabled={loading} className="text-base font-medium text-indigo-600 dark:text-indigo-400 hover:underline min-h-12">Export JSON</button>
                </div>

                <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Import Data</h3>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-1">Restore clients, cases, documents, and billing from a JSON backup.</p>
                  </div>
                  <button type="button" onClick={handleImport} disabled={loading} className="text-base font-medium text-indigo-600 dark:text-indigo-400 hover:underline min-h-12">Upload JSON</button>
                </div>

                <div className="p-5 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/5 rounded-xl space-y-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-500">Load Sample Data</h3>
                    <p className="text-base text-amber-700 dark:text-amber-400 mt-1">Load a complete sample firm with clients, cases, documents, and appointments for demonstration.</p>
                  </div>
                  <button type="button" onClick={() => setConfirmAction('reset')} className="text-base font-medium text-amber-700 dark:text-amber-500 hover:underline min-h-12">Load Sample Firm</button>
                </div>

                <div className="p-5 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-500/5 rounded-xl space-y-4">
                  <div className="w-10 h-10 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-rose-900 dark:text-rose-500">Start Fresh</h3>
                    <p className="text-base text-rose-700 dark:text-rose-400 mt-1">Remove all firm data and begin with a clean workspace. This cannot be undone.</p>
                  </div>
                  <button type="button" onClick={() => setConfirmAction('clear')} className="text-base font-medium text-rose-700 dark:text-rose-500 hover:underline min-h-12">Clear All Data</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <AiSettingsPanel onSaved={() => showToast('AI settings saved.')} />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === 'reset'}
        title="Load sample firm data?"
        message="This will replace your current data with a complete sample immigration firm. You can export your data first if you need a backup."
        confirmLabel="Load Sample Data"
        onConfirm={() => { setConfirmAction(null); void handleResetData(); }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === 'clear'}
        title="Clear all firm data?"
        message="This permanently removes all clients, cases, documents, and billing records. This action cannot be undone."
        confirmLabel="Clear Everything"
        destructive
        onConfirm={() => { setConfirmAction(null); void handleClearData(); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
