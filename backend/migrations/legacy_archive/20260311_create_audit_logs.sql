-- Create superadmin_audit_logs table
CREATE TABLE IF NOT EXISTS superadmin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    superadmin_id UUID NOT NULL REFERENCES profiles(id),
    action VARCHAR(255) NOT NULL,
    target_id UUID,
    target_type VARCHAR(50),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_superadmin_id ON superadmin_audit_logs(superadmin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON superadmin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON superadmin_audit_logs(created_at);

-- Enable RLS
ALTER TABLE superadmin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view logs
CREATE POLICY "Super admins can view audit logs"
    ON superadmin_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'superadmin')
        )
    );

-- No one can update or delete logs
CREATE POLICY "No one can update audit logs"
    ON superadmin_audit_logs FOR UPDATE
    USING (false);

CREATE POLICY "No one can delete audit logs"
    ON superadmin_audit_logs FOR DELETE
    USING (false);

-- System can insert logs (backend uses service role usually, but for completeness)
CREATE POLICY "System can insert audit logs"
    ON superadmin_audit_logs FOR INSERT
    WITH CHECK (true);
