'use client';

import { useState, useCallback, useRef } from 'react';
import { FileText, Upload, Lock, ShieldCheck, AlertCircle, X, ChevronRight, Loader2 } from 'lucide-react';
import { isPdfEncrypted, validatePdfPassword } from '~/lib/utils/pdf';

export type ImportType = 'loan' | 'transaction';

interface SecureImportZoneProps {
  type: ImportType;
  accept?: string[];
  title?: string;
  subtitle?: string;
  onUpload: (file: File, password?: string) => Promise<void>;
  onCancel?: () => void;
}

type ImportStatus = 'idle' | 'uploading' | 'encrypted' | 'verifying' | 'processing' | 'error';

export function SecureImportZone({
  type,
  accept = ['.pdf', '.csv'],
  title,
  subtitle,
  onUpload,
  onCancel
}: SecureImportZoneProps) {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    setError(null);
    setPasswordError(null);
    setPassword('');
    
    // Validate format
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const isPdf = selectedFile.type === 'application/pdf' || ext === 'pdf';
    const isCsv = selectedFile.type === 'text/csv' || ext === 'csv';

    if (!isPdf && !isCsv) {
      setError('Unsupported file type. Please use PDF or CSV.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File is too large. Max 10MB.');
      return;
    }

    setFile(selectedFile);

    if (isPdf) {
      setStatus('verifying');
      const encrypted = await isPdfEncrypted(selectedFile);
      if (encrypted) {
        setStatus('encrypted');
        return;
      }
    }

    // Not encrypted or CSV -> Start upload
    startUpload(selectedFile);
  };

  const startUpload = async (fileToUpload: File, pwd?: string) => {
    setStatus('uploading');
    try {
      await onUpload(fileToUpload, pwd);
      // Status will be handled by parent (e.g. redirecting)
    } catch (err: any) {
      setError(err.message || 'Failed to process document. Please try again.');
      setStatus('error');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !password) return;

    setStatus('verifying');
    const isValid = await validatePdfPassword(file, password);
    
    if (isValid) {
      startUpload(file, password);
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setStatus('encrypted');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setError(null);
    setPassword('');
    setPasswordError(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  }, []);

  // UI States
  
  if (status === 'encrypted') {
    return (
      <div className="w-full bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Password Required</h3>
              <p className="text-sm text-gray-500">This {file?.name.endsWith('.pdf') ? 'PDF' : 'file'} is protected.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 ml-1">Document Password</label>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to unlock"
                className={`w-full h-12 px-4 rounded-xl border transition-all outline-none text-sm font-medium ${
                  passwordError 
                    ? 'border-red-200 bg-red-50 text-red-900 focus:border-red-300' 
                    : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5'
                }`}
              />
              {passwordError && (
                <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {passwordError}
                </p>
              )}
            </div>

            <div className="bg-blue-50/50 rounded-xl p-4 flex items-start gap-3 border border-blue-100/50">
              <ShieldCheck size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed font-medium">
                Your password is used only for this session and is never stored on our servers. 
                We process your data securely.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 h-12 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
              >
                Unlock and Continue <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-6 h-12 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (status === 'uploading' || status === 'verifying' || status === 'processing') {
    return (
      <div className="w-full bg-white rounded-[32px] border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-400">
            <FileText size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
            <Loader2 size={14} className="animate-spin text-gray-900" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {status === 'verifying' ? 'Verifying document...' : status === 'uploading' ? 'Uploading statement...' : 'Analyzing data...'}
        </h3>
        <p className="text-sm text-gray-500 max-w-[240px] leading-relaxed font-medium">
          {file?.name}
        </p>
        <div className="mt-8 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-900 rounded-full animate-progress" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className={`relative group bg-white rounded-[32px] border-2 border-dashed transition-all duration-300 ${
          isDragging 
            ? 'border-gray-900 bg-gray-50/50 scale-[1.01]' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{ minHeight: '300px' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(',')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileChange(f);
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gray-50 group-hover:bg-white border border-gray-100 group-hover:border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-gray-900 transition-all duration-500 mb-6 shadow-sm group-hover:shadow-md">
            <Upload size={28} />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {title || `Import ${type === 'loan' ? 'Loan' : 'Transactions'}`}
          </h3>
          <p className="text-[15px] text-gray-400 font-medium max-w-[320px] leading-relaxed mb-8">
            {subtitle || 'Drag and drop your statement here or click to browse your files'}
          </p>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 h-12 bg-gray-900 text-white text-[15px] font-bold rounded-2xl hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-900/10 transition-all flex items-center gap-2"
            >
              Choose File
            </button>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 grayscale opacity-60">
                <span className="text-[11px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">PDF</span>
                <span className="text-[11px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">CSV</span>
              </div>
              <div className="w-px h-3 bg-gray-200" />
              <div className="flex items-center gap-1.5 text-gray-400 group/pwd cursor-default">
                <Lock size={12} className="group-hover/pwd:text-amber-500 transition-colors" />
                <span className="text-[11px] font-bold tracking-tight">Supports Passwords</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="absolute bottom-6 left-8 right-8 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-red-500 border border-red-100">
                  <X size={16} />
                </div>
                <p className="text-xs font-bold text-red-700">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors px-2 py-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[12px] text-gray-400 font-medium mt-6">
        Bank statements are processed locally. Your sensitive data never leaves your control.
      </p>
    </div>
  );
}
