'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function LoanUploadZone() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Use PDF, JPG, or PNG.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Max 20MB.');
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setUploading(false); return; }

    const ext = file.name.split('.').pop() ?? 'pdf';
    const storagePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('user_documents')
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      setError("Couldn't upload your document. Try again or enter details manually.");
      setUploading(false);
      return;
    }

    const { data: doc, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        storage_path: storagePath,
        source: 'web',
      } as any)
      .select()
      .single();

    if (insertError || !doc) {
      await supabase.storage.from('user_documents').remove([storagePath]);
      setError("Couldn't register your document. Try again or enter details manually.");
      setUploading(false);
      return;
    }

    router.push(`/dashboard/loans/review?doc=${doc.id}`);
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="w-full max-w-md">
      <label
        className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-2xl px-8 py-10 cursor-pointer transition-colors ${
          dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="text-3xl select-none">📄</span>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {uploading ? 'Uploading…' : 'Drag & drop your loan document here'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">or click to upload · PDF, JPG, PNG</p>
        </div>
        <input
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          disabled={uploading}
        />
      </label>

      <p className="text-center text-[11px] text-gray-400 mt-3">
        We only use your document to extract loan details. Your file is not shared.
      </p>

      {error && (
        <p className="text-center text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
