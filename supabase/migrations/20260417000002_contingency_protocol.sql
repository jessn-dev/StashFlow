-- Milestone 17: Contingency Protocol Engine
-- -----------------------------------------------------------------------------

-- 1. Update Profiles with Contingency Mode
ALTER TABLE public.profiles 
ADD COLUMN contingency_mode_active BOOLEAN DEFAULT FALSE;

-- 2. Create Category Metadata for Essentiality
-- This allows users to define what counts as "survival" categories
CREATE TABLE public.category_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category expense_category NOT NULL,
  is_essential BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- 3. RLS Policies
ALTER TABLE public.category_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own category metadata" ON public.category_metadata 
FOR ALL USING (auth.uid() = user_id);

-- 4. Seed Essential categories for existing users (Default logic)
-- Housing, Utilities, Food are usually essential.
INSERT INTO public.category_metadata (user_id, category, is_essential)
SELECT id, 'housing', TRUE FROM public.profiles
ON CONFLICT DO NOTHING;

INSERT INTO public.category_metadata (user_id, category, is_essential)
SELECT id, 'utilities', TRUE FROM public.profiles
ON CONFLICT DO NOTHING;

INSERT INTO public.category_metadata (user_id, category, is_essential)
SELECT id, 'food', TRUE FROM public.profiles
ON CONFLICT DO NOTHING;
