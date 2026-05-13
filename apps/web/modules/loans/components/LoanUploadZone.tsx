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
     * 1. Route file through the upload-document edge function for server-side validation:
     *    - MIME type + magic bytes check (prevents disguised executables)
     *    - 5 MB size cap
     *    - SHA-256 content hashing for deduplication
     *    - Storage upload + documents row creation with rollback on DB failure
     * 2. If the file is a duplicate, redirect to the existing document's review page.
     * 3. For password-protected files, manually invoke parse-document with the key.
     *    (The DB trigger fires on INSERT but has no access to the user-supplied password.)
     * 4. Redirect to the review page — DocumentStatusWatcher polls for extraction results.
     */
    const supabase = createClient();

    const formData = new FormData();
    formData.append('file', file);

    const { data: result, error: uploadErr } = await supabase.functions.invoke('upload-document', {
      body: formData,
    });

    if (uploadErr || !result?.document) throw new Error("Couldn't upload your document. Try again.");

    const doc = result.document;

    // Manual invocation required for password-protected files — the DB trigger that fires
    // on INSERT has no access to the user-supplied password string.
    if (password) {
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
