-- 1. Create Documents Table
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT NOT NULL, -- in bytes
  content_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents" ON public.documents 
FOR ALL USING (auth.uid() = user_id);

-- 3. Storage Bucket Configuration (Metadata)
-- Note: Buckets must be created via the Supabase Dashboard or CLI.
-- We use this migration to define policies for the 'user_documents' bucket.

-- Policy for viewing own documents
CREATE POLICY "Users can view own documents" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'user_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy for uploading own documents
CREATE POLICY "Users can upload own documents" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'user_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy for deleting own documents
CREATE POLICY "Users can delete own documents" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'user_documents' AND (storage.foldername(name))[1] = auth.uid()::text);
