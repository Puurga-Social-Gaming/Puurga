-- Migration: Create System Error Logs table
-- Description: Automated logging for backend exceptions and API failures

CREATE TABLE IF NOT EXISTS public.system_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    level TEXT NOT NULL DEFAULT 'ERROR', -- ERROR, WARNING, CRITICAL, INFO
    message TEXT NOT NULL,
    stack TEXT,
    path TEXT,
    method TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Optimize for dashboard retrieval
CREATE INDEX IF NOT EXISTS idx_system_error_logs_created_at ON public.system_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_level ON public.system_error_logs(level);

-- Grant access (only backend service role should ideally write, but we follow app patterns)
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

-- Only Super Admins should be able to view these logs
CREATE POLICY "Super Admins can view system error logs" 
ON public.system_error_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (role = 'super_admin' OR role = 'superadmin')
    )
);
