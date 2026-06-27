import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import type { Case, CaseStage, CaseType } from '../../domain/models/Sales';
import { Plus, Search, X, FileText } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { format } from 'date-fns';

const STAGES: CaseStage[] = ['Assessment', 'Preparation', 'Filed', 'Pending USCIS', 'RFE Received', 'Approved', 'Denied', 'Closed'];

const STAGE_COLORS: Record<CaseStage, string> = {
  'Assessment': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Preparation': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Filed': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Pending USCIS': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'RFE Received': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Denied': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Closed': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STAGE_DOT: Record<CaseStage, string> = {
  'Assessment': 'bg-slate-400',
  'Preparation': 'bg-blue-500',
  'Filed': 'bg-indigo-500',
  'Pending USCIS': 'bg-purple-500',
  'RFE Received': 'bg-orange-500',
  'Approved': 'bg-green-500',
  'Denied': 'bg-red-500',
  'Closed': 'bg-gray-400',
};

const CASE_TYPES: CaseType[] = ['I-130', 'Adjustment of Status', 'H1B', 'EB2', 'EB3', 'F1', 'OPT', 'B1', 'B2', 'N400', 'Green Card', 'Asylum', 'Removal Defense', 'Waivers', 'Other'];

type ViewMode = 'kanban' | 'list';

export const Cases = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', clientId: '', caseType: 'I-130' as CaseType, stage: 'Assessment' as CaseStage, uscisReceiptNumber: '', value: '' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [caseData, clientData] = await Promise.all([
          repos.cases.getAll(tenantId),
          repos.clients.getAll(tenantId)
        ]);
        setCases(caseData);
        setClients(clientData.map(c => ({ id: c.id, name: c.name })));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filtered = cases.filter(c => {
    const matchSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.uscisReceiptNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = !stageFilter || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const handleDrop = async (e: React.DragEvent, stage: CaseStage) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData('caseId');
    if (!caseId) return;
    await repos.cases.update(caseId, { stage });
    setCases(cases.map(c => c.id === caseId ? { ...c, stage } : c));
  };

  const handleCreate = async () => {
    if (!form.name || !form.clientId) return;
    const newCase = await repos.cases.create({
      tenantId, name: form.name, clientId: form.clientId, caseType: form.caseType,
      stage: form.stage, value: parseFloat(form.value) || 0, probability: 80,
      uscisReceiptNumber: form.uscisReceiptNumber, notes: '',
      createdAt: new Date(), updatedAt: new Date()
    });
    setCases([newCase, ...cases]);
    setShowModal(false);
    setForm({ name: '', clientId: '', caseType: 'I-130', stage: 'Assessment', uscisReceiptNumber: '', value: '' });
  };

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading cases...</div>;

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" /> Case Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{cases.length} total cases · {cases.filter(c => c.stage === 'Pending USCIS').length} pending USCIS</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('list')} className={cn("px-3 py-2 text-sm transition-colors", viewMode === 'list' ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400")}>List</button>
            <button onClick={() => setViewMode('kanban')} className={cn("px-3 py-2 text-sm transition-colors", viewMode === 'kanban' ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400")}>Kanban</button>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Case
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search case name or receipt number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white">
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Stage Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {STAGES.map(stage => (
          <button key={stage} onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
            className={cn("rounded-lg p-2.5 border text-left transition-all text-xs",
              stageFilter === stage ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-gray-200 dark:border-gray-800",
              "bg-white dark:bg-gray-900 hover:border-indigo-400")}>
            <div className="font-bold text-gray-900 dark:text-white text-sm">{cases.filter(c => c.stage === stage).length}</div>
            <div className="text-gray-500 dark:text-gray-400 truncate">{stage}</div>
          </button>
        ))}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-800/30 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-5 py-3.5 font-semibold">Case</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">Receipt #</th>
                  <th className="px-5 py-3.5 font-semibold">Stage</th>
                  <th className="px-5 py-3.5 font-semibold">Value</th>
                  <th className="px-5 py-3.5 font-semibold">Filing Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">No cases found.</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{c.name}</div>
                      <div className="text-xs text-gray-400">{clients.find(cl => cl.id === c.clientId)?.name || '—'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md font-medium">{c.caseType}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-gray-700 dark:text-gray-300">{c.uscisReceiptNumber || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit", STAGE_COLORS[c.stage])}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", STAGE_DOT[c.stage])}></span>
                        {c.stage}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(c.value)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{c.filingDate ? format(c.filingDate, 'MMM d, yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => (
              <div key={stage} className="flex flex-col w-64 shrink-0"
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, stage)}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("w-2 h-2 rounded-full", STAGE_DOT[stage])}></span>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{stage}</h3>
                  <span className="bg-gray-100 dark:bg-gray-800 text-xs px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{cases.filter(c => c.stage === stage).length}</span>
                </div>
                <div className="flex flex-col gap-2 min-h-20 bg-gray-50 dark:bg-gray-800/20 rounded-xl p-2">
                  {filtered.filter(c => c.stage === stage).map(c => (
                    <div key={c.id} draggable onDragStart={e => e.dataTransfer.setData('caseId', c.id)}
                      className="glass-card p-3 cursor-grab active:cursor-grabbing text-sm">
                      <div className="font-medium text-gray-900 dark:text-white text-xs line-clamp-2">{c.name}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">{c.caseType}</span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(c.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Case Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Immigration Case</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Case Name *</label>
                <input type="text" placeholder="e.g. I-130 Family Petition - Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Case Type</label>
                <select value={form.caseType} onChange={e => setForm({ ...form, caseType: e.target.value as CaseType })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">USCIS Receipt Number</label>
                <input type="text" placeholder="WAC1234567890" value={form.uscisReceiptNumber} onChange={e => setForm({ ...form, uscisReceiptNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stage</label>
                  <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as CaseStage })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee (USD)</label>
                  <input type="number" placeholder="2500" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Create Case</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




