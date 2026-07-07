import { useCallback, useEffect, useState } from 'react';
import type { CopilotScope } from '../../../../domain/ai/CaseContext';
import type { CaseCopilotEmailDraft, CaseCopilotInsights, CaseCopilotMessage } from '../../../../domain/ai/CaseCopilot';
import { caseCopilotService } from '../../../../application/ai/caseCopilotService';
import { useRepositories } from '../../../contexts/RepositoryContext';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../../lib/utils';
import { design } from '../../../../lib/design';
import {
  AlertTriangle,
  Bot,
  Calendar,
  FileWarning,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';

type TabId = 'overview' | 'chat' | 'email';

const RISK_STYLES = {
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  critical: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
} as const;

const EMAIL_TYPES: { id: CaseCopilotEmailDraft['type']; label: string }[] = [
  { id: 'client_update', label: 'Client Update' },
  { id: 'missing_docs', label: 'Missing Documents' },
  { id: 'appointment_reminder', label: 'Appointment Reminder' },
  { id: 'interview_prep', label: 'Interview Prep' },
  { id: 'follow_up', label: 'Follow-up' },
];

interface CaseCopilotPanelProps {
  scope: CopilotScope;
  title: string;
}

export function CaseCopilotPanel({ scope, title }: CaseCopilotPanelProps) {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const [tab, setTab] = useState<TabId>('overview');
  const [insights, setInsights] = useState<CaseCopilotInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CaseCopilotMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [emailType, setEmailType] = useState<CaseCopilotEmailDraft['type']>('client_update');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const loadInsights = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { insights: data } = await caseCopilotService.getInsights(
        repos, tenantId, scope, user?.role, force,
      );
      setInsights(data);
      setMessages(caseCopilotService.getChatHistory(tenantId, scope, user?.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load copilot.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repos, tenantId, scope, user?.role]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const handleAsk = async () => {
    if (!question.trim() || chatLoading) return;
    const q = question.trim();
    setQuestion('');
    setChatLoading(true);
    setTab('chat');
    try {
      const { messages: updated } = await caseCopilotService.askQuestion(
        repos, tenantId, scope, user?.role, q,
      );
      setMessages(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateEmail = async () => {
    setEmailLoading(true);
    try {
      const draft = await caseCopilotService.generateEmailDraft(
        repos, tenantId, scope, user?.role, emailType,
      );
      setEmailSubject(draft.subject);
      setEmailBody(draft.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email draft failed.');
    } finally {
      setEmailLoading(false);
    }
  };

  const quickQuestions = [
    'What documents are still missing?',
    'Summarize this case.',
    'What should I do next?',
    'What deadlines are coming up?',
    'What risks do you see?',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading case intelligence…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Case Copilot</h3>
            <p className="text-sm text-gray-500">{title}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadInsights(true)}
          disabled={refreshing}
          className={cn(design.btn.secondary, 'text-sm')}
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        {([
          ['overview', 'Overview', Sparkles],
          ['chat', 'Ask AI', MessageSquare],
          ['email', 'Email', Mail],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium min-h-10',
              tab === id
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {insights && tab === 'overview' && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className={cn('rounded-xl p-3', RISK_STYLES[insights.riskLevel])}>
              <p className="text-xs opacity-80">Risk Level</p>
              <p className="text-lg font-semibold capitalize">{insights.riskLevel}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{insights.currentStatus}</p>
            </div>
          </div>

          <section className="glass-card p-4 space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">Executive Summary</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{insights.executiveSummary}</p>
            {insights.fromCache && <p className="text-xs text-gray-400">Cached · {insights.providerId}</p>}
          </section>

          <section className="glass-card p-4 space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Timeline Intelligence
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{insights.timelineSummary}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{insights.timelineNarrative}</p>
          </section>

          {insights.suggestedNextActions.length > 0 && (
            <section className="glass-card p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Suggested Next Actions</h4>
              <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {insights.suggestedNextActions.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </section>
          )}

          {insights.openTasks.length > 0 && (
            <section className="glass-card p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Open Tasks</h4>
              <ul className="text-sm space-y-1">
                {insights.openTasks.map((t) => (
                  <li key={t.title} className="text-gray-700 dark:text-gray-300">
                    {t.title} <span className="text-gray-400">({t.priority})</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insights.upcomingDeadlines.length > 0 && (
            <section className="glass-card p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Upcoming Deadlines</h4>
              <ul className="text-sm space-y-1">
                {insights.upcomingDeadlines.map((d) => (
                  <li key={`${d.title}-${d.date}`} className="text-gray-700 dark:text-gray-300">
                    {d.title} — {d.date.slice(0, 10)} ({d.type})
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insights.missingDocuments.length > 0 && (
            <section className="glass-card p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                <FileWarning className="w-4 h-4" /> Missing Documents
              </h4>
              <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
                {insights.missingDocuments.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </section>
          )}

          {insights.riskItems.length > 0 && (
            <section className="glass-card p-4 space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Risk Analysis
              </h4>
              {insights.riskItems.map((r) => (
                <div key={r.message} className="text-sm border-l-2 border-amber-400 pl-3">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{r.message}</p>
                  <p className="text-gray-500">{r.recommendation}</p>
                </div>
              ))}
            </section>
          )}

          {insights.recentAiAnalyses.length > 0 && (
            <section className="glass-card p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Recent AI Analyses</h4>
              <ul className="text-sm space-y-2">
                {insights.recentAiAnalyses.map((a) => (
                  <li key={`${a.fileName}-${a.date}`} className="text-gray-700 dark:text-gray-300">
                    <strong>{a.fileName}</strong> ({a.documentType}) — {a.date.slice(0, 10)}
                    {a.summary && <p className="text-gray-500 text-xs mt-0.5">{a.summary.slice(0, 120)}…</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-gray-500">{insights.disclaimer}</p>
        </div>
      )}

      {tab === 'chat' && (
        <div className="flex flex-col gap-3 min-h-[400px]">
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setQuestion(q); }}
                className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[40vh] glass-card p-4">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">Ask anything about this case.</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'rounded-xl p-3 text-sm max-w-[90%]',
                  m.role === 'user'
                    ? 'ml-auto bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
                )}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && <p className="text-sm text-gray-400 animate-pulse">Thinking…</p>}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleAsk(); }}
              placeholder="Ask about this case…"
              className={cn(design.input, 'flex-1')}
            />
            <button type="button" onClick={() => void handleAsk()} disabled={chatLoading} className={design.btn.primary}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EMAIL_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEmailType(t.id)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border',
                  emailType === t.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void handleGenerateEmail()} disabled={emailLoading} className={design.btn.secondary}>
            {emailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Draft
          </button>
          <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className={design.input} placeholder="Subject" />
          <textarea rows={8} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} className={design.input} placeholder="Email body" />
          <p className="text-xs text-gray-500">Draft only — never sent automatically. Edit before use.</p>
        </div>
      )}
    </div>
  );
}
