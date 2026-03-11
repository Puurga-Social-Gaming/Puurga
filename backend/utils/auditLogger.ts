import { supabase } from '../config/supabase';

export interface AuditLogOptions {
  superadminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logs a Super Admin action to the superadmin_audit_logs table.
 */
export const logSuperAdminAction = async (options: AuditLogOptions) => {
  try {
    const { 
      superadminId, 
      action, 
      targetId, 
      targetType, 
      details = {}, 
      ipAddress, 
      userAgent 
    } = options;

    const { error } = await supabase
      .from('superadmin_audit_logs')
      .insert({
        superadmin_id: superadminId,
        action,
        target_id: targetId,
        target_type: targetType,
        details,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (error) {
      console.error('Failed to log Super Admin action:', error);
    }
  } catch (error) {
    console.error('Unexpected error in logSuperAdminAction:', error);
  }
};
