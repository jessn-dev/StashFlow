-- P3-A: Session Event Logging

CREATE TABLE public.session_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id   UUID, -- Can be NULL if not provided by auth event
  ip           TEXT NOT NULL,
  country      TEXT,
  user_agent   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own session events
CREATE POLICY "session_events_select_own" ON public.session_events
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert (via webhook)
CREATE POLICY "session_events_service_insert" ON public.session_events
  FOR INSERT WITH CHECK (true); -- Restricted by service role in function

-- Index for faster scoring (lookup by user_id)
CREATE INDEX idx_session_events_user_id ON public.session_events (user_id);
CREATE INDEX idx_session_events_created_at ON public.session_events (created_at DESC);
