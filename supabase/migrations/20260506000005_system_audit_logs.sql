-- Create System Audit Logs table for security monitoring
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    severity TEXT CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')) DEFAULT 'info',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only admins (service_role) can insert or read from audit logs
-- Regular users cannot see or tamper with their own audit logs
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage audit logs"
ON public.system_audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.system_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.system_audit_logs(created_at);

-- Comment
COMMENT ON TABLE public.system_audit_logs IS 'Immutable trail of critical system events for compliance (GDPR, GLBA, PCI).';
