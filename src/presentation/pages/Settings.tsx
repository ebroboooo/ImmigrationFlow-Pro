import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useRepositories } from '../contexts/RepositoryContext';
import { seedDemoData, seedFreshData } from '../../infrastructure/seeders/DemoSeeder';
import { exportTenantData, downloadJson } from '../../lib/exportData';
import { Save, RefreshCw, Download, Upload, Trash2, Building2, Globe, Monitor, Users, Database } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Settings = () => {
  const { user, tenantId } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, saveSettings } = useSettings();
  const repos = useRepositories();

  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    setLoading(true);
    saveSettings();
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    setSaveMessage('Settings saved successfully.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleResetData = async () => {
    if (window.confirm('Reset all data and load demo dataset for Smith & Associates Immigration Law?')) {
      setLoading(true);
      await seedDemoData();
      setLoading(false);
      window.location.href = '/';
    }
  };

  const handleClearData = async () => {
    if (window.confirm('WARNING: This will completely wipe all data. Are you sure?')) {
      setLoading(true);
      await seedFreshData();
      setLoading(false);
      window.location.href = '/welcome';
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportTenantData(repos, tenantId);
      downloadJson(data, `immigrationflow-export-${new Date().toISOString().slice(0, 10)}.json`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      alert('Import requires Firebase or server-side processing. Export is available for backup.');
    };
    input.click();
  };

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building2 },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'data', label: 'Data Management', icon: Database },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your firm profile, preferences, and data.</p>
          {saveMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">{saveMessage}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
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
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                activeTab === tab.id
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                  ['Phone Number', 'phone', 'text'],
                ] as const).map(([label, key, type]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                    <input type={type} value={settings[key]} onChange={e => updateSettings({ [key]: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Physical Address</label>
                  <textarea value={settings.address} onChange={e => updateSettings({ address: e.target.value })} rows={3}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">Localization Preferences</h2>
              <div className="grid gap-6 max-w-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                  <select value={settings.language} onChange={e => updateSettings({ language: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="ar">Arabic (RTL)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                  <select value={settings.currency} onChange={e => updateSettings({ currency: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                  <select value={settings.timezone} onChange={e => updateSettings({ timezone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white">
                    <option value="America/New_York">Eastern (US)</option>
                    <option value="America/Chicago">Central (US)</option>
                    <option value="America/Los_Angeles">Pacific (US)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="rtl" checked={settings.rtl} onChange={e => updateSettings({ rtl: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <label htmlFor="rtl" className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Right-to-Left (RTL) Layout</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">System Settings</h2>
              <div className="grid gap-6 max-w-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">UI Theme</label>
                  <div className="flex gap-4">
                    <button onClick={() => setTheme('light')} className={cn("px-4 py-2 rounded-lg border", theme === 'light' ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")}>Light Mode</button>
                    <button onClick={() => setTheme('dark')} className={cn("px-4 py-2 rounded-lg border", theme === 'dark' ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")}>Dark Mode</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Repository Engine</label>
                  <select disabled value={settings.repositoryEngine}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed">
                    <option value="mock">Local Mock Storage (Active)</option>
                    <option value="firebase">Firebase (Configuration Required)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Repository abstraction is ready. Switch to Firebase when cloud credentials are configured.</p>
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
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider">{user?.role}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Role-based permissions are enforced across all modules. Admin users have full access.</p>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Download all firm data as a JSON backup file.</p>
                  </div>
                  <button onClick={handleExport} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Export JSON</button>
                </div>

                <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Import Data</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Restore from a JSON backup (requires Firebase for full restore).</p>
                  </div>
                  <button onClick={handleImport} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Upload JSON</button>
                </div>

                <div className="p-5 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/5 rounded-xl space-y-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-500">Regenerate Demo Data</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Load Smith & Associates demo: 100 clients, 95 cases, 400 documents, 60 appointments.</p>
                  </div>
                  <button onClick={handleResetData} className="text-sm font-medium text-amber-700 dark:text-amber-500 hover:underline">Run Demo Seeder</button>
                </div>

                <div className="p-5 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-500/5 rounded-xl space-y-4">
                  <div className="w-10 h-10 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-rose-900 dark:text-rose-500">Fresh Start</h3>
                    <p className="text-sm text-rose-700 dark:text-rose-400 mt-1">Start completely fresh. This action cannot be undone.</p>
                  </div>
                  <button onClick={handleClearData} className="text-sm font-medium text-rose-700 dark:text-rose-500 hover:underline">Wipe All Data</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
