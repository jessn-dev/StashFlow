'use client';

/**
 * @module LoanUploadZone
 * Provides a secure drag-and-drop interface for uploading loan documents (PDFs, images).
 * It manages the multi-step process of storage upload, database registration, and 
 * triggering the AI extraction pipeline.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SecureImportZone } from '~/modules/import';
import { useDocumentUpload } from '~/modules/import/hooks/useDocumentUpload';

/**
 * Component that wraps SecureImportZone to handle the specific logic for loan document ingestion.
 * 
 * @returns {JSX.Element} The rendered upload zone.
 */
export function LoanUploadZone() {
  const router = useRouter();
  const { state, upload } = useDocumentUpload();

  /**
   * Coordinates the sequence of uploading a file and initiating AI analysis.
   */
  const handleUpload = async (file: File, password?: string) => {
    await upload(file, password);
  };

  // Listen for successful upload and classification to route appropriately
  useEffect(() => {
    if (state.status === 'ready') {
      router.push(`/dashboard/loans/review?doc=${state.documentId}`);
    }
  }, [state, router]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <SecureImportZone 
        type="loan"
        onUpload={handleUpload}
        isProcessing={state.status === 'uploading' || state.status === 'processing'}
      />
    </div>
  );
}
