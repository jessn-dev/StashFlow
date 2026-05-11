'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '~/lib/supabase/client';
import { SecureImportZone } from '~/modules/import';

export function LoanUploadZone() {
  const router = useRouter();

  const handleUpload = async (file: File, password?: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const ext = file.name.split('.').pop() ?? 'pdf';
    const storagePath = `${user.id}/${Date.now()}.${ext}`;

    // 1. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('user_documents')
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      throw new Error("Couldn't upload your document. Try again.");
    }

    // 2. Register in documents table
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
      throw new Error("Couldn't register your document.");
    }

    // 3. Trigger edge function (if password provided, we invoke manually with password header)
    if (password) {
      // NOTE: Manual invocation allows passing the session-only password securely
      await supabase.functions.invoke('parse-document', {
        body: { record: { id: doc.id } },
        headers: { 'x-document-password': password }
      });
    }
    router.push(`/dashboard/loans/review?doc=${doc.id}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <SecureImportZone 
        type="loan"
        onUpload={handleUpload}
      />
    </div>
  );
}
