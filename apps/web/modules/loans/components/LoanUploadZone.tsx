'use client';

/**
 * @module LoanUploadZone
 * Provides a secure drag-and-drop interface for uploading loan documents (PDFs, images).
 * It manages the multi-step process of storage upload, database registration, and 
 * triggering the AI extraction pipeline.
 */

import { useRouter } from 'next/navigation';
import { createClient } from '~/lib/supabase/client';
import { SecureImportZone } from '~/modules/import';

/**
 * Component that wraps SecureImportZone to handle the specific logic for loan document ingestion.
 * 
 * @returns {JSX.Element} The rendered upload zone.
 */
export function LoanUploadZone() {
  const router = useRouter();

  /**
   * Coordinates the sequence of uploading a file and initiating AI analysis.
   * 
   * @param {File} file - The document file to be uploaded.
   * @param {string} [password] - Optional password for encrypted PDF files.
   * @throws {Error} If authentication fails, upload fails, or database registration fails.
   */
  const handleUpload = async (file: File, password?: string) => {
    /*
     * PSEUDOCODE:
     * 1. Authenticate the user to ensure data privacy.
     * 2. Construct a unique storage path in the user's private bucket.
     * 3. Upload the binary file to Supabase Storage.
     * 4. Insert a tracking record into the 'documents' table.
     * 5. If the document is password-protected, call the parsing function immediately with the key.
     * 6. Redirect the user to the review page to await extraction results.
     */
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    // We use a timestamp-based unique path to prevent collisions within the user's folder.
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
      // Cleanup: Remove the orphan file if database registration fails to save storage costs.
      await supabase.storage.from('user_documents').remove([storagePath]);
      throw new Error("Couldn't register your document.");
    }

    // 3. Trigger edge function
    if (password) {
      // Manual invocation is required for password-protected files because the 
      // database trigger doesn't have access to the user-provided password string.
      await supabase.functions.invoke('parse-document', {
        body: { record: { id: doc.id } },
        headers: { 'x-document-password': password }
      });
    }
    
    // We navigate immediately so the user can see the progress bar/skeleton in DocumentStatusWatcher.
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
