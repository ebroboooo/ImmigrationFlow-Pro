import { useEffect, useState } from 'react';
import { aiProviderManager } from '../../../infrastructure/ai/providers/aiProviderManager';
import {
  DEFAULT_AI_SETTINGS,
  loadAISettings,
  saveAISettings,
  type AISettings,
} from '../../../infrastructure/ai/settings/aiSettingsStorage';
import type { AIProviderHealth } from '../../../domain/ai/AIUsage';
import { cn } from '../../../lib/utils';
import { design } from '../../../lib/design';
import { Bot, RefreshCw, Zap, ScanLine } from 'lucide-react';
import { ocrProviderManager } from '../../../infrastructure/ai/ocr/ocrProviderManager';
import type { OCRProviderHealth } from '../../../domain/ai/OCRUsage';

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
] as const;

interface AiSettingsPanelProps {
  onSaved?: () => void;
}

export function AiSettingsPanel({ onSaved }: AiSettingsPanelProps) {
  const [settings, setSettings] = useState<AISettings>(() => loadAISettings());
  const [health, setHealth] = useState<AIProviderHealth | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  const [usageCount, setUsageCount] = useState(0);

  const [ocrTesting, setOcrTesting] = useState(false);
  const [ocrTestResult, setOcrTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  const [ocrHealth, setOcrHealth] = useState<OCRProviderHealth | null>(null);
  const ocrStatus = ocrProviderManager.getProviderStatus();

  useEffect(() => {
    void aiProviderManager.refreshServerStatus().then(setHealth);
    setUsageCount(aiProviderManager.getUsageMetrics().length);
    setOcrHealth(ocrProviderManager.getHealth().find((h) => h.providerId === 'tesseract') ?? null);
  }, []);

  const patch = (partial: Partial<AISettings>) => setSettings((s) => ({ ...s, ...partial }));

  const handleSave = () => {
    saveAISettings(settings);
    aiProviderManager.saveSettings(settings);
    onSaved?.();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    saveAISettings(settings);
    const result = await aiProviderManager.testConnection('gemini');
    setTestResult(result);
    setHealth(await aiProviderManager.refreshServerStatus());
    setTesting(false);
  };

  const handleOcrTest = async () => {
    setOcrTesting(true);
    setOcrTestResult(null);
    saveAISettings(settings);
    const result = await ocrProviderManager.testConnection('tesseract');
    setOcrTestResult(result);
    setOcrHealth(ocrProviderManager.getHealth().find((h) => h.providerId === 'tesseract') ?? null);
    setOcrTesting(false);
  };

  const geminiHealth = health ?? aiProviderManager.getHealth().find((h) => h.providerId === 'gemini');

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4 flex items-center gap-2">
        <Bot className="w-5 h-5 text-indigo-500" /> AI Configuration
      </h2>

      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 text-sm text-indigo-900 dark:text-indigo-200">
        API keys are stored server-side only. Set <code className="font-mono">GEMINI_API_KEY</code> in your server environment — never in the browser.
      </div>

      <div className="grid gap-6 max-w-lg">
        <label className="flex items-center gap-3 min-h-12">
          <input
            type="checkbox"
            checked={settings.geminiEnabled}
            onChange={(e) => patch({ geminiEnabled: e.target.checked })}
            className="w-5 h-5"
          />
          <span className="text-base font-medium text-gray-700 dark:text-gray-300">Enable Google Gemini</span>
        </label>

        <div className="space-y-2">
          <label className="text-base font-medium text-gray-700 dark:text-gray-300">Default Provider</label>
          <select
            value={settings.defaultProvider}
            onChange={(e) => patch({ defaultProvider: e.target.value as AISettings['defaultProvider'] })}
            className={design.input}
          >
            <option value="gemini">Google Gemini (when configured)</option>
            <option value="heuristic">Heuristic / Pattern only</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-base font-medium text-gray-700 dark:text-gray-300">Gemini Model</label>
          <select
            value={settings.geminiModel}
            onChange={(e) => patch({ geminiModel: e.target.value })}
            className={design.input}
          >
            {GEMINI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-base font-medium text-gray-700 dark:text-gray-300">Server Endpoint</label>
          <input
            type="url"
            value={settings.serverEndpoint}
            onChange={(e) => patch({ serverEndpoint: e.target.value })}
            className={design.input}
            placeholder="/api/ai/gemini"
          />
          <p className="text-sm text-gray-500">Secure proxy path — API key is never sent to the client.</p>
        </div>

        <div className="glass-card p-4 space-y-3 text-sm">
          <p className="font-semibold text-gray-900 dark:text-white">Connection Status</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500">Server key</p>
              <p className={cn('font-medium', geminiHealth?.configured ? 'text-emerald-600' : 'text-amber-600')}>
                {geminiHealth?.configured ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Gemini enabled</p>
              <p className="font-medium text-gray-900 dark:text-white">{settings.geminiEnabled ? 'Yes' : 'No'}</p>
            </div>
            {geminiHealth?.lastLatencyMs != null && (
              <div>
                <p className="text-gray-500">Last latency</p>
                <p className="font-medium">{geminiHealth.lastLatencyMs}ms</p>
              </div>
            )}
            {geminiHealth?.lastSuccessfulCall && (
              <div>
                <p className="text-gray-500">Last success</p>
                <p className="font-medium text-xs">{new Date(geminiHealth.lastSuccessfulCall).toLocaleString()}</p>
              </div>
            )}
          </div>
          {geminiHealth?.lastError && (
            <p className="text-rose-600 dark:text-rose-400 text-xs break-words">Last error: {geminiHealth.lastError}</p>
          )}
          <p className="text-gray-500">Tracked requests: {usageCount}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleTest} disabled={testing} className={cn(design.btn.secondary)}>
            {testing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            Test Connection
          </button>
          <button type="button" onClick={handleSave} className={design.btn.primary}>Save AI Settings</button>
          <button
            type="button"
            onClick={() => { setSettings({ ...DEFAULT_AI_SETTINGS }); saveAISettings(DEFAULT_AI_SETTINGS); }}
            className={design.btn.secondary}
          >
            Reset Defaults
          </button>
        </div>

        {testResult && (
          <p className={cn('text-sm', testResult.success ? 'text-emerald-600' : 'text-rose-600')}>
            {testResult.success
              ? `Connection successful (${testResult.latencyMs ?? 0}ms)`
              : `Connection failed: ${testResult.error}`}
          </p>
        )}

        <h3 className="text-base font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 pt-6 flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-indigo-500" /> OCR Configuration
        </h3>

        <label className="flex items-center gap-3 min-h-12">
          <input
            type="checkbox"
            checked={settings.ocrEnabled}
            onChange={(e) => patch({ ocrEnabled: e.target.checked })}
            className="w-5 h-5"
          />
          <span className="text-base font-medium text-gray-700 dark:text-gray-300">Enable OCR (Tesseract.js — local, no API key)</span>
        </label>

        <div className="space-y-2">
          <label className="text-base font-medium text-gray-700 dark:text-gray-300">Default OCR Provider</label>
          <select
            value={settings.ocrDefaultProvider}
            onChange={(e) => patch({ ocrDefaultProvider: e.target.value as AISettings['ocrDefaultProvider'] })}
            className={design.input}
          >
            <option value="tesseract">Tesseract.js (Local)</option>
            <option value="none">Disabled</option>
          </select>
        </div>

        <div className="glass-card p-4 space-y-3 text-sm">
          <p className="font-semibold text-gray-900 dark:text-white">OCR Status</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500">Provider</p>
              <p className="font-medium">{ocrStatus.providerName}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <p className={cn('font-medium', ocrStatus.configured ? 'text-emerald-600' : 'text-amber-600')}>
                {ocrStatus.configured ? 'Ready' : 'Not available'}
              </p>
            </div>
            {ocrStatus.averageConfidence > 0 && (
              <div>
                <p className="text-gray-500">Avg confidence</p>
                <p className="font-medium">{Math.round(ocrStatus.averageConfidence * 100)}%</p>
              </div>
            )}
            {ocrStatus.averageProcessingTimeMs > 0 && (
              <div>
                <p className="text-gray-500">Avg processing</p>
                <p className="font-medium">{Math.round(ocrStatus.averageProcessingTimeMs)}ms</p>
              </div>
            )}
          </div>
          <p className="text-gray-500 text-xs">Supported: PDF, PNG, JPG, JPEG, WEBP, TIFF</p>
          {ocrHealth?.lastError && (
            <p className="text-rose-600 text-xs">Last error: {ocrHealth.lastError}</p>
          )}
        </div>

        <button type="button" onClick={() => void handleOcrTest()} disabled={ocrTesting} className={cn(design.btn.secondary)}>
          {ocrTesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
          Test OCR
        </button>

        {ocrTestResult && (
          <p className={cn('text-sm', ocrTestResult.success ? 'text-emerald-600' : 'text-rose-600')}>
            {ocrTestResult.success
              ? `OCR test passed (${ocrTestResult.latencyMs ?? 0}ms)`
              : `OCR test failed: ${ocrTestResult.error}`}
          </p>
        )}
      </div>
    </div>
  );
}
