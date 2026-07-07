import { useState, useEffect, useCallback } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Document } from '../../domain/models/Sales';
import {
  FileText, Upload, Search, AlertCircle, CheckCircle, Clock, Download,
  FileImage, File, SortAsc, Pencil, Trash2, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/ui/Skeleton';
import { Modal, DocumentPreviewPanel } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionMenu } from '../components/ui/ActionMenu';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { design } from '../../lib/design';
import {
  fileStorage, LOCAL_FILE_PREFIX, downloadDocumentFile, isLocalFileUrl,
} from '../../infrastructure/storage/fileStorage';

const DOC_CATEGORIES = ['Passport','Birth Certificate','Marriage Certificate','Divorce Certificate','Employment Letter','Tax Returns','USCIS Notices','Court Documents','Evidence','Other'] as const;
const STATUS_CONFIG = {
  Pending: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  Uploaded: { icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  Reviewed: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  Rejected: { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
} as const;

type SortKey = 'name' | 'date' | 'status';

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return FileImage;
  return File;
}

export const Documents = () => {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [showModal, setShowModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', clientId: '', category: 'Passport' as Document['category'] });
  const [renameDoc, setRenameDoc] = useState<Document | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [replaceDoc, setReplaceDoc] = useState<Document | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [docData, clientData] = await Promise.all([
          repos.documents.getAll(tenantId),
          repos.clients.getAll(tenantId),
        ]);
        setDocuments(docData);
        setClients(clientData.map((c) => ({ id: c.id, name: c.name })));
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    if (!previewDoc) {
      setPreviewUrl(null);
      return;
    }
    let revoked: string | null = null;
    const load = async () => {
      if (isLocalFileUrl(previewDoc.url)) {
        const url = await fileStorage.getObjectUrl(previewDoc.id);
        revoked = url;
        setPreviewUrl(url);
      } else {
        setPreviewUrl(previewDoc.url ?? null);
      }
    };
    void load();
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [previewDoc]);

  const filtered = documents
    .filter((d) => {
      const matchSearch = !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = !categoryFilter || d.category === categoryFilter;
      const matchStatus = !statusFilter || d.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'status') return a.status.localeCompare(b.status);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const pickFile = useCallback((file: File) => {
    setPendingFile(file);
    setForm((f) => ({ ...f, name: file.name }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) pickFile(file);
  }, [pickFile]);

  const handleCreate = async () => {
    if (!form.name || !form.clientId) {
      showToast('Please enter a name and select a client.', 'error');
      return;
    }
    try {
      setUploadProgress(10);
      const newDoc = await repos.documents.create({
        tenantId,
        name: form.name,
        clientId: form.clientId,
        category: form.category,
        status: 'Uploaded',
        url: pendingFile ? `${LOCAL_FILE_PREFIX}${form.name}` : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setUploadProgress(50);
      if (pendingFile) {
        await fileStorage.save(newDoc.id, pendingFile, pendingFile.name);
        await repos.documents.update(newDoc.id, { url: `${LOCAL_FILE_PREFIX}${newDoc.id}` });
        newDoc.url = `${LOCAL_FILE_PREFIX}${newDoc.id}`;
      }
      setUploadProgress(100);
      setDocuments([newDoc, ...documents]);
      setShowModal(false);
      setForm({ name: '', clientId: '', category: 'Passport' });
      setPendingFile(null);
      setUploadProgress(0);
      showToast('Document uploaded successfully.');
    } catch {
      showToast('Upload failed. Please try again.', 'error');
      setUploadProgress(0);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await downloadDocumentFile(doc.id, doc.name, doc.url);
      showToast('Download started.');
    } catch {
      showToast('Could not download file.', 'error');
    }
  };

  const handleRename = async () => {
    if (!renameDoc || !renameValue.trim()) return;
    const updated = await repos.documents.update(renameDoc.id, { name: renameValue.trim(), updatedAt: new Date() });
    setDocuments(documents.map((d) => (d.id === updated.id ? updated : d)));
    setRenameDoc(null);
    showToast('Document renamed.');
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    if (isLocalFileUrl(deleteDoc.url)) await fileStorage.delete(deleteDoc.id);
    await repos.documents.delete(deleteDoc.id);
    setDocuments(documents.filter((d) => d.id !== deleteDoc.id));
    setDeleteDoc(null);
    showToast('Document deleted.');
  };

  const handleReplace = async () => {
    if (!replaceDoc || !replaceFile) return;
    try {
      await fileStorage.save(replaceDoc.id, replaceFile, replaceFile.name);
      const updated = await repos.documents.update(replaceDoc.id, {
        name: replaceFile.name,
        url: `${LOCAL_FILE_PREFIX}${replaceDoc.id}`,
        status: 'Uploaded',
        updatedAt: new Date(),
      });
      setDocuments(documents.map((d) => (d.id === updated.id ? updated : d)));
      setReplaceDoc(null);
      setReplaceFile(null);
      showToast('File replaced.');
    } catch {
      showToast('Replace failed.', 'error');
    }
  };

  const docMenuItems = (doc: Document) => [
    { label: 'Preview', icon: FileText, onClick: () => setPreviewDoc(doc) },
    { label: 'Download', icon: Download, onClick: () => void handleDownload(doc) },
    { label: 'Rename', icon: Pencil, onClick: () => { setRenameDoc(doc); setRenameValue(doc.name); } },
    { label: 'Replace File', icon: RefreshCw, onClick: () => setReplaceDoc(doc) },
    { label: 'Delete', icon: Trash2, destructive: true, onClick: () => setDeleteDoc(doc) },
  ];

  const pendingCount = documents.filter((d) => d.status === 'Pending').length;
  const reviewedCount = documents.filter((d) => d.status === 'Reviewed').length;

  if (loading) return <PageSkeleton />;

  const renderDocRow = (doc: Document) => {
    const cfg = STATUS_CONFIG[doc.status];
    const Icon = cfg.icon;
    const FileIcon = fileIcon(doc.name);
    const client = clients.find((c) => c.id === doc.clientId);
    return (
      <article key={doc.id} className="glass-card p-4 md:hidden space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <FileIcon className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{doc.name}</h3>
            <p className="text-xs text-gray-500">{client?.name ?? '—'} · {doc.category}</p>
          </div>
          <ActionMenu items={docMenuItems(doc)} ariaLabel={`Actions for ${doc.name}`} />
        </div>
        <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full', cfg.bg, cfg.color)}>
          <Icon className="w-3 h-3" /> {doc.status}
        </span>
      </article>
    );
  };

  return (
    <div className={design.page}>
      <PageHeader
        title="Documents"
        description={`${documents.length} files · ${pendingCount} pending · ${reviewedCount} reviewed`}
        icon={FileText}
        action={
          <button type="button" onClick={() => setShowModal(true)} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        }
      />

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{pendingCount} documents waiting for upload</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['Pending', 'Uploaded', 'Reviewed', 'Rejected'] as const).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <button key={status} type="button" onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={cn('rounded-xl p-3 border text-left transition-all', statusFilter === status ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900')}>
              <Icon className={cn('w-4 h-4 mb-1', cfg.color)} />
              <div className="text-lg font-bold">{documents.filter((d) => d.status === status).length}</div>
              <div className="text-xs text-gray-500">{status}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="search" placeholder="Search documents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={cn(design.input, 'pl-9')} />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={cn(design.input, 'sm:max-w-[160px]')}>
          <option value="">All Categories</option>
          {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={cn(design.input, 'sm:max-w-[120px]')}>
          <option value="date">Sort: Date</option>
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Upload client documents to keep everything in one place." actionLabel="Upload Document" onAction={() => setShowModal(true)} />
      ) : (
        <>
          <div className="md:hidden space-y-3">{filtered.map(renderDocRow)}</div>
          <div className="glass-card overflow-hidden hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/95 dark:bg-gray-900/95 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3.5">Document</th>
                  <th className="px-4 py-3.5">Client</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5"><SortAsc className="w-3.5 h-3.5 inline" /> Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((doc) => {
                  const cfg = STATUS_CONFIG[doc.status];
                  const StatusIcon = cfg.icon;
                  const FileIcon = fileIcon(doc.name);
                  const client = clients.find((c) => c.id === doc.clientId);
                  return (
                    <tr key={doc.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <FileIcon className="w-4 h-4 text-indigo-500" />
                          </div>
                          <button type="button" onClick={() => setPreviewDoc(doc)} className="font-medium text-sm hover:text-indigo-600 text-left">{doc.name}</button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm">{client?.name || '—'}</td>
                      <td className="px-4 py-3.5"><span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 px-2 py-1 rounded-lg">{doc.category}</span></td>
                      <td className="px-4 py-3.5"><span className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full', cfg.bg, cfg.color)}><StatusIcon className="w-3 h-3" />{doc.status}</span></td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{format(doc.createdAt, 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3.5 text-right"><ActionMenu items={docMenuItems(doc)} ariaLabel={`Actions for ${doc.name}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setPendingFile(null); setUploadProgress(0); }} title="Upload Document"
        footer={<><button type="button" onClick={() => setShowModal(false)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button><button type="button" onClick={() => void handleCreate()} disabled={!form.name || !form.clientId} className={cn(design.btn.primary, 'flex-1 disabled:opacity-50')}>Save</button></>}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1.5">File Name *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={design.input} /></div>
          <div><label className="block text-sm font-medium mb-1.5">Client *</label>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={design.input}>
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Document['category'] })} className={design.input}>
              {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
            className={cn('border-2 border-dashed rounded-xl p-8 text-center transition-colors', dragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 dark:border-gray-700')}>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">{pendingFile ? pendingFile.name : 'Drag & drop a file here'}</p>
            <input type="file" className="sr-only" id="doc-upload" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
            <label htmlFor="doc-upload" className="mt-3 inline-block text-sm text-indigo-600 cursor-pointer hover:underline">Choose file</label>
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${uploadProgress}%` }} /></div>
          )}
        </div>
      </Modal>

      <Modal open={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.name ?? 'Preview'} size="lg">
        {previewDoc && <DocumentPreviewPanel name={previewDoc.name} url={previewUrl ?? undefined} category={previewDoc.category} />}
      </Modal>

      <Modal open={!!renameDoc} onClose={() => setRenameDoc(null)} title="Rename Document"
        footer={<><button type="button" onClick={() => setRenameDoc(null)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button><button type="button" onClick={() => void handleRename()} className={cn(design.btn.primary, 'flex-1')}>Save</button></>}>
        <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className={design.input} />
      </Modal>

      <Modal open={!!replaceDoc} onClose={() => { setReplaceDoc(null); setReplaceFile(null); }} title="Replace File"
        footer={<><button type="button" onClick={() => setReplaceDoc(null)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button><button type="button" onClick={() => void handleReplace()} disabled={!replaceFile} className={cn(design.btn.primary, 'flex-1 disabled:opacity-50')}>Replace</button></>}>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)} className={design.input} />
        {replaceFile && <p className="text-sm text-gray-500 mt-2">Selected: {replaceFile.name}</p>}
      </Modal>

      <ConfirmDialog open={!!deleteDoc} title="Delete Document?" message={`Delete "${deleteDoc?.name}"? This cannot be undone.`} confirmLabel="Delete" destructive onConfirm={() => void handleDelete()} onCancel={() => setDeleteDoc(null)} />
    </div>
  );
};
