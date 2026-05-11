-- Update the trigger function to call the unified parse-document edge function
CREATE OR REPLACE FUNCTION public.tr_on_document_inserted()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'http://supabase_edge_runtime_StashFlow:8081/parse-document',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'dev-secret-123',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.tr_on_document_inserted IS 'Trigger function to invoke unified AI document parsing on new document uploads.';
