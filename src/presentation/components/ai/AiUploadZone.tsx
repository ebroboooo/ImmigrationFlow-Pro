import { useCallback, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { design } from '../../../lib/design';

interface AiUploadZoneProps {
  onUpload: (file: File) => void;
  processing: boolean;
}

export function AiUploadZone({ onUpload, processing }: AiUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (file) onUpload(file);
  }, [onUpload]);

  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-colors',
        dragOver ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900',
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      {processing ? (
        <Loader2 className="w-12 h-12 mx-auto text-indigo-600 animate-spin" />
      ) : (
        <Upload className="w-12 h-12 mx-auto text-indigo-500" aria-hidden="true" />
      )}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-4">Upload Immigration Documents</h2>
      <p className="text-base text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
        Drop PDF, image, or text files here. The system will extract information for your review before anything is saved.
      </p>
      <label className={cn(design.btn.primary, 'mt-6 inline-flex cursor-pointer')}>
        <FileText className="w-5 h-5" />
        Choose File
        <input
          type="file"
          className="sr-only"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.json"
          disabled={processing}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    </div>
  );
}
