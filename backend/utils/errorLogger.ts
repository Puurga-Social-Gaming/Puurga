import { supabase } from '../config/supabase';

interface ErrorLogOptions {
  message: string;
  level?: 'ERROR' | 'WARNING' | 'CRITICAL' | 'INFO';
  stack?: string;
  path?: string;
  method?: string;
  userId?: string;
  ipAddress?: string;
  metadata?: any;
}

/**
 * Logs a system error to the database for Super Admin reporting.
 */
export const logSystemError = async (options: ErrorLogOptions) => {
  try {
    const { 
      message, 
      level = 'ERROR', 
      stack, 
      path, 
      method, 
      userId, 
      ipAddress, 
      metadata = {} 
    } = options;

    const { error } = await supabase
      .from('system_error_logs')
      .insert({
        message,
        level,
        stack,
        path,
        method,
        user_id: userId,
        ip_address: ipAddress,
        metadata
      });

    if (error) {
      console.error('CRITICAL: Failed to log system error to database:', error);
      // Fallback to console if DB is down
      console.error('Original Error:', message, stack);
    }
  } catch (err) {
    console.error('CRITICAL: Error log helper failed:', err);
  }
};
