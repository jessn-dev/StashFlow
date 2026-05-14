import { useState } from 'react';
import { createClient } from '~/lib/supabase/client';

export type DocumentUploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export type DocumentUploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'processing' }
  | { status: 'ready'; documentId: string; documentType: 'LOAN' | 'BANK_STATEMENT' | 'UNKNOWN'; alreadyProcessed: boolean }
  | { status: 'error'; message: string };

/**
 * Handles the shared upload → validation → parse-document trigger flow.
 * Caller receives documentId + documentType and routes to the appropriate review UI.
 */
export function useDocumentUpload() {
  const [state, setState] = useState<DocumentUploadState>({ status: 'idle' });
  const supabase = createClient();

  const upload = async (file: File, password?: string): Promise<void> => {
    setState({ status: 'uploading' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: result, error: uploadErr } = await supabase.functions.invoke('upload-document', {
        body: formData,
      });
      if (uploadErr || !result?.document) throw new Error('Upload failed. Try again.');

      const doc = result.document;

      // Fast-path: duplicate already processed — skip re-parsing
      if (result.duplicated && doc.processing_status === 'success') {
        const inferredType = doc.inferred_type === 'Loan' ? 'LOAN'
          : doc.inferred_type === 'Bank Statement' ? 'BANK_STATEMENT'
          : 'UNKNOWN';
        setState({ status: 'ready', documentId: doc.id, documentType: inferredType, alreadyProcessed: true });
        return;
      }

      setState({ status: 'processing' });

      // Password-protected: DB trigger fired without the key — re-invoke with password
      if (password) {
        const { error: funcError } = await supabase.functions.invoke('parse-document', {
          body: { record: { id: doc.id } },
          headers: { 'x-document-password': password },
        });
        if (funcError) throw funcError;
      }

      // Poll until classified — we need document_type to know where to route
      const documentType = await pollForType(supabase, doc.id);
      setState({ status: 'ready', documentId: doc.id, documentType, alreadyProcessed: false });

    } catch (err: any) {
      setState({ status: 'error', message: err.message || 'Upload failed.' });
    }
  };

  const reset = () => setState({ status: 'idle' });

  return { state, upload, reset };
}

/**
 * Polls the database until the document processing status is 'success' or 'error'.
 */
async function pollForType(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  maxAttempts = 90,     // 3 minutes at 2s
  intervalMs = 2000
): Promise<'LOAN' | 'BANK_STATEMENT' | 'UNKNOWN'> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase
      .from('documents')
      .select('processing_status, inferred_type, processing_error')
      .eq('id', documentId)
      .single();

    if (error) throw error;

    if (data.processing_status === 'success') {
      return data.inferred_type === 'Loan' ? 'LOAN'
        : data.inferred_type === 'Bank Statement' ? 'BANK_STATEMENT'
        : 'UNKNOWN';
    }

    if (data.processing_status?.startsWith('error')) {
      const err = data.processing_error as any;
      throw new Error(err?.message || 'AI extraction failed.');
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Processing timed out.');
}
