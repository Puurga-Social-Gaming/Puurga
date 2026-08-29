-- Create security_events table for tracking suspicious user activity
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_agent TEXT,
  ip_address INET,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_security_events_user_id (user_id),
  INDEX idx_security_events_created_at (created_at),
  INDEX idx_security_events_event_type (event_type)
);

-- Create function to notify super admins of security events
CREATE OR REPLACE FUNCTION notify_super_admins_of_security_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification to all super admins
  INSERT INTO notifications (
    type,
    sender_id,
    receiver_id,
    read,
    is_read,
    created_at,
    updated_at,
    metadata
  )
  SELECT 
    'security_alert',
    '00000000-0000-0000-0000-000000000000', -- System user ID
    u.id,
    false,
    false,
    NOW(),
    NOW(),
    jsonb_build_object(
      'event_type', NEW.event_type,
      'user_id', NEW.user_id,
      'ip_address', NEW.ip_address,
      'url', NEW.url,
      'timestamp', NEW.created_at
    )
  FROM users u
  WHERE u.is_super_admin = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically notify super admins
CREATE TRIGGER trigger_notify_super_admins_security
  AFTER INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_super_admins_of_security_event();

-- Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only super admins can view security events
CREATE POLICY "Super admins can view all security events" ON security_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

-- Only system can insert security events
CREATE POLICY "System can insert security events" ON security_events
  FOR INSERT WITH CHECK (false);

-- No one can update security events
CREATE POLICY "No updates on security events" ON security_events
  FOR UPDATE USING (false);

-- No one can delete security events  
CREATE POLICY "No deletes on security events" ON security_events
  FOR DELETE USING (false);
