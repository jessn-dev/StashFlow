import { useState } from 'react';
import { createClient } from '~/lib/supabase/client';

export type DocumentUploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export type DocumentUploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'processing' }
  | { status: 'needs_password'; documentId: string }
  | { status: 'ready'; documentId: string; documentType: 'LOAN' | 'BANK_STATEMENT' | 'UNKNOWN'; alreadyProcessed: boolean }
  | { status: 'error'; message: string };

/**
 * Maps a DB inferred_type string to the typed document kind used by the UI.
 *
 * @param inferredType - Raw value from the documents table.
 * @returns Typed document kind.
 */
function mapInferredType(inferredType: string): 'LOAN' | 'BANK_STATEMENT' | 'UNKNOWN' {
  if (inferredType === 'Loan') return 'LOAN';
  if (inferredType === 'Bank Statement') return 'BANK_STATEMENT';
  return 'UNKNOWN';
}

/**
 * Re-invokes the parse-document edge function with a password header.
 * Used when the DB trigger fired on upload but lacked the password for an encrypted PDF.
 *
 * @param supabase - Supabase client.
 * @param documentId - ID of the document to re-parse.
 * @param password - Decryption password for the PDF.
 */
async function triggerPasswordParse(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  password: string,
): Promise<void> {
  const { error: funcError } = await supabase.functions.invoke('parse-document', {
    body: { record: { id: documentId } },
    headers: { 'x-document-password': password },
  });
  if (funcError) throw funcError;
}

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
        setState({ status: 'ready', documentId: doc.id, documentType: mapInferredType(doc.inferred_type), alreadyProcessed: true });
        return;
      }

      setState({ status: 'processing' });

      // Password-protected: DB trigger fired without the key — re-invoke with password
      if (password) await triggerPasswordParse(supabase, doc.id, password);

      const documentType = await pollForType(supabase, doc.id);
      setState({ status: 'ready', documentId: doc.id, documentType, alreadyProcessed: false });

    } catch (err: any) {
      // PASSWORD_REQUIRED surfaces from pollForType — route to the password prompt state
      if (err?.code === 'PASSWORD_REQUIRED') {
        setState({ status: 'needs_password', documentId: err.documentId });
      } else {
        setState({ status: 'error', message: err.message || 'Upload failed.' });
      }
    }
  };

  const reset = () => setState({ status: 'idle' });

  return { state, upload, reset };
}

type PollOutcome =
  | { status: 'done'; type: 'LOAN' | 'BANK_STATEMENT' | 'UNKNOWN' }
  | { status: 'retry' }
  | { status: 'error'; error: Error };

/**
 * Interprets a single poll snapshot into a typed outcome.
 * Keeps branching logic out of the polling loop so the loop body stays flat.
 *
 * @param data - Row from the documents table.
 * @param documentId - Attached to PASSWORD_REQUIRED errors so the caller can route to the prompt.
 * @returns Discriminated union describing what the loop should do next.
 */
function interpretDocumentStatus(
  data: { processing_status: string; inferred_type: string; processing_error: unknown },
  documentId: string,
): PollOutcome {
  if (data.processing_status === 'success') {
    return { status: 'done', type: mapInferredType(data.inferred_type) };
  }
  if (data.processing_status === 'error_password') {
    const err = Object.assign(new Error('PASSWORD_REQUIRED'), { code: 'PASSWORD_REQUIRED', documentId });
    return { status: 'error', error: err };
  }
  if (data.processing_status?.startsWith('error')) {
    const processingError = data.processing_error as { message?: string } | null;
    return { status: 'error', error: new Error(processingError?.message || 'AI extraction failed.') };
  }
  return { status: 'retry' };
}

/**
 * Polls the database until the document processing status is 'success' or 'error'.
 *
 * @param supabase - Supabase client.
 * @param documentId - UUID of the document to poll.
 * @param maxAttempts - Maximum number of poll iterations (default 90 = 3 min at 2s).
 * @param intervalMs - Delay between polls in milliseconds.
 * @returns The resolved document type.
 * @throws When polling times out, a DB error occurs, or extraction fails.
 */
async function pollForType(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  maxAttempts = 90,
  intervalMs = 2000,
): Promise<'LOAN' | 'BANK_STATEMENT' | 'UNKNOWN'> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase
      .from('documents')
      .select('processing_status, inferred_type, processing_error')
      .eq('id', documentId)
      .single();

    if (error) throw error;

    const outcome = interpretDocumentStatus(data, documentId);
    if (outcome.status === 'done') return outcome.type;
    if (outcome.status === 'error') throw outcome.error;

    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Processing timed out.');
}
