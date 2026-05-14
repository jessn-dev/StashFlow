-- Add error_password to processing_status check constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_processing_status_check;

ALTER TABLE documents ADD CONSTRAINT documents_processing_status_check 
CHECK (processing_status IN ('pending', 'processing', 'success', 'error_rate_limit', 'error_password', 'error_generic'));
