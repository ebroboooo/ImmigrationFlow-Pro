import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import type { Document } from '../../domain/models/Sales';
import { FileText, Upload, Search, AlertCircle, CheckCircle, Clock, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const DOC_CATEGORIES = ['Passport','Birth Certificate','Marriage Certificate','Divorce Certificate','Employment Letter','Tax Returns','USCIS Notices','Court Documents','Evidence','Other'];

const STATUS_CONFIG = {
  'Pending': { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  'Uploaded': { icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'Reviewed': { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  'Rejected': { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
} as const;

export const Documents = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', clientId: '', category: 'Passport', status: 'Uploaded' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [docData, clientData] = await Promise.all([
          repos.documents.getAll(tenantId),
          repos.clients.getAll(tenantId)
        ]);
        setDocuments(docData);
        setClients(clientData.map(c => ({ id: c.id, name: c.name })));
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    if (tenantId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filtered = documents.filter(d => {
    const matchSearch = !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = !categoryFilter || d.category === categoryFilter;
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const handleCreate = async () => {
    if (!form.name || !form.clientId) return;
    const newDoc = await repos.documents.create({
      tenantId, name: form.name, clientId: form.clientId,
      category: form.category as Document['category'],
      status: form.status as Document['status'],
      createdAt: new Date(), updatedAt: new Date()
    });
    setDocuments([newDoc, ...documents]);
    setShowModal(false);
    setForm({ name: '', clientId: '', category: 'Passport', status: 'Uploaded' });
  };

  const pendingCount = documents.filter(d => d.status === 'Pending').length;
  const reviewedCount = documents.filter(d => d.status === 'Reviewed').length;

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading documents...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" /> Document Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{documents.length} documents · {pendingCount} pending · {reviewedCount} reviewed</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Alert for missing docs */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{pendingCount} documents pending client upload</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Send reminders to clients with pending document requests.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['Pending','Uploaded','Reviewed','Rejected'] as const).map(status => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <button key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={cn("rounded-xl p-4 border text-left transition-all", statusFilter === status ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-gray-200 dark:border-gray-800",
                "bg-white dark:bg-gray-900 hover:border-indigo-400")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", cfg.bg)}>
                <Icon className={cn("w-4 h-4", cfg.color)} />
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{documents.filter(d => d.status === status).length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{status}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search documents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white">
          <option value="">All Categories</option>
          {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-800/30 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="px-5 py-3.5 font-semibold">Document</th>
                <th className="px-5 py-3.5 font-semibold">Client</th>
                <th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">No documents found.</td></tr>
              ) : filtered.map(doc => {
                const cfg = STATUS_CONFIG[doc.status];
                const Icon = cfg.icon;
                const client = clients.find(c => c.id === doc.clientId);
                return (
                  <tr key={doc.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{doc.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">{client?.name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md">{doc.category}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit", cfg.bg, cfg.color)}>
                        <Icon className="w-3 h-3" /> {doc.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{format(doc.createdAt, 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upload Document</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Name *</label>
                <input type="text" placeholder="Passport_John_Smith.pdf" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Upload Document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
