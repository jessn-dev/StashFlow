-- DISASTER RECOVERY: DOCUMENT REPLAY TOOLING
-- Use this to re-trigger document parsing for documents that failed or got stuck.

/**
 * Re-triggers parsing for a specific document.
 */
CREATE OR REPLACE FUNCTION public.replay_document_parsing(p_document_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_doc RECORD;
  v_project_ref TEXT;
  v_service_role_jwt TEXT;
  v_webhook_secret TEXT;
BEGIN
  -- 1. Get document details
  SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN 'Document not found';
  END IF;

  -- 2. Fetch secrets from vault or config (Assuming they are set as vault secrets or env vars)
  -- For local/dev we use defaults, for prod you should adjust this.
  v_webhook_secret := 'dev-secret-123';
  v_service_role_jwt := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  -- 3. Reset status
  UPDATE public.documents 
  SET processing_status = 'pending', 
      processing_error = NULL 
  WHERE id = p_document_id;

  -- 4. Call Edge Function
  PERFORM
    net.http_post(
      url := 'http://supabase_edge_runtime_StashFlow:8081/parse-document',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_webhook_secret,
        'Authorization', 'Bearer ' || v_service_role_jwt
      ),
      body := jsonb_build_object('record', row_to_json(v_doc))
    );

  RETURN 'Replay triggered for document ' || p_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Re-triggers all failed documents.
 */
CREATE OR REPLACE FUNCTION public.replay_all_failed_documents()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_id UUID;
BEGIN
  FOR v_id IN (SELECT id FROM public.documents WHERE processing_status = 'error_generic' OR processing_status = 'error_rate_limit')
  LOOP
    PERFORM public.replay_document_parsing(v_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.replay_document_parsing IS 'Manually re-trigger parsing for a specific document (Disaster Recovery).';
COMMENT ON FUNCTION public.replay_all_failed_documents IS 'Batch re-trigger parsing for all failed documents (Disaster Recovery).';
