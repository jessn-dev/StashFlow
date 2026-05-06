-- Enable pg_net extension for outgoing HTTP requests from the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a trigger function to call the parse-loan-document edge function
CREATE OR REPLACE FUNCTION public.tr_on_document_inserted()
RETURNS TRIGGER AS $$
BEGIN
  -- Use pg_net to call the local edge function
  -- Docker container name: supabase_edge_runtime_StashFlow (project-specific suffix)
  -- The x-webhook-secret must match the PARSE_LOAN_WEBHOOK_SECRET environment variable in the edge function
  PERFORM
    net.http_post(
      url := 'http://supabase_edge_runtime_StashFlow:8081/parse-loan-document',
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

-- Add the trigger to the documents table
DROP TRIGGER IF EXISTS tr_parse_loan_document ON public.documents;
CREATE TRIGGER tr_parse_loan_document
AFTER INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.tr_on_document_inserted();

COMMENT ON FUNCTION public.tr_on_document_inserted IS 'Trigger function to invoke AI document parsing via Edge Function on new document uploads.';
