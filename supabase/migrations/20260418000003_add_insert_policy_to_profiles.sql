-- Add INSERT policy for profiles to support initial upsert/creation
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);
