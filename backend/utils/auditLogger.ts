import { supabase, isSupabaseAvailable } from '../config/supabase';

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

    if (!isSupabaseAvailable || !supabase) {
      console.warn('⚠️ Supabase not available, skipping audit logging');
      return;
    }

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
      // If table doesn't exist, just log to console and don't fail
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.warn('⚠️ Audit log table does not exist, skipping audit logging');
        return;
      }
      throw error;
    }
  } catch (error: any) {
    // Don't fail the main operation if audit logging fails
    console.warn('⚠️ Audit logging failed:', error.message);
  }
};
