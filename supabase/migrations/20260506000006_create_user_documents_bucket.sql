-- Bucket must exist for RLS policies in 20260416000003_secure_documents.sql to take effect.
-- ON CONFLICT DO NOTHING makes this idempotent across db resets.
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_documents', 'user_documents', false)
ON CONFLICT (id) DO NOTHING;
