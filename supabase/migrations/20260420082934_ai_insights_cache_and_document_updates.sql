-- AI Caching and Document Metadata Updates

-- 1. Create AI Insights Cache Table for Macro Advisor
CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region TEXT NOT NULL,
    currency TEXT NOT NULL,
    data_version_hash TEXT NOT NULL,
    insight_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(region, currency)
);

-- Enable RLS on ai_insights_cache
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the cache
CREATE POLICY "Allow authenticated users to read ai_insights_cache" 
ON public.ai_insights_cache FOR SELECT 
TO authenticated 
USING (true);

-- 2. Update Documents Table to support extraction results
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS inferred_type TEXT,
ADD COLUMN IF NOT EXISTS extracted_data JSONB;

-- 3. Auto-Pruning logic (for Staging/Test environments)
-- Note: This is a template for pg_cron. In local dev, it is created but inactive 
-- until the cron extension is enabled in the specific environment.

-- Function to prune old data
CREATE OR REPLACE FUNCTION public.prune_stale_test_data()
RETURNS void AS $$
BEGIN
    -- Delete AI insights cache older than 30 days
    DELETE FROM public.ai_insights_cache WHERE updated_at < now() - interval '30 days';
    
    -- Delete documents and their storage references older than 7 days for test purposes
    -- Note: Actual storage removal must be handled via Edge Function or Admin API
    DELETE FROM public.documents WHERE created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for environment-specific deployment
COMMENT ON TABLE public.ai_insights_cache IS 'Stores generated AI insights to prevent redundant API calls. Use pg_cron for TTL on non-prod environments.';
