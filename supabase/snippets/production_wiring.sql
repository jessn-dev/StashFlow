-- POST-DEPLOYMENT WIRING: PRODUCTION
-- Run this in your Supabase Dashboard SQL Editor AFTER Phase 5 (Edge Function Deploy)

-- 1. Replace with your actual production data
-- GET THESE FROM: Supabase Dashboard -> Project Settings -> API
DO $$
DECLARE
    PROJECT_REF TEXT := 'YOUR_PROJECT_REF_HERE'; -- e.g. abc-def-ghi
    SERVICE_ROLE_JWT TEXT := 'YOUR_SERVICE_ROLE_JWT_HERE';
    WEBHOOK_SECRET TEXT := 'YOUR_PARSE_LOAN_WEBHOOK_SECRET_HERE'; -- Must match PARSE_LOAN_WEBHOOK_SECRET secret
BEGIN

-- 2. Update the trigger to use the live Production Edge Function
CREATE OR REPLACE FUNCTION public.tr_on_document_inserted()
RETURNS TRIGGER AS $func$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://' || PROJECT_REF || '.supabase.co/functions/v1/parse-loan-document',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', WEBHOOK_SECRET,
        'Authorization', 'Bearer ' || SERVICE_ROLE_JWT
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

END $$;
