import { useEffect } from 'react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => {
      const root = document.querySelector('[data-modal-root="true"]');
      const focusable = root?.querySelector<HTMLElement>('input, textarea, select, button:not([aria-label="Close"])');
      focusable?.focus();
    }, 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} aria-label="Close dialog" />
      <div
        data-modal-root="true"
        className={cn(
          'relative bg-white dark:bg-gray-900 w-full shadow-2xl max-h-[92dvh] overflow-hidden flex flex-col safe-bottom animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200',
          maxW,
          'rounded-t-2xl sm:rounded-2xl',
        )}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-12 min-w-12 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 flex gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface DocumentPreviewProps {
  name: string;
  url?: string;
  category?: string;
}

export function DocumentPreviewPanel({ name, url, category }: DocumentPreviewProps) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  const isPdf = ext === 'pdf';

  if (url && isImage) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <img src={url} alt={name} className="w-full max-h-64 object-contain" />
      </div>
    );
  }

  if (url && isPdf) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-64">
        <iframe src={url} title={name} className="w-full h-full bg-white" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center bg-gray-50/50 dark:bg-gray-800/30">
      {isImage ? <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" /> : <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />}
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</p>
      {category && <p className="text-xs text-gray-400 mt-1">{category}</p>}
      <p className="text-xs text-gray-400 mt-3">Preview available when file URL is attached</p>
    </div>
  );
}
