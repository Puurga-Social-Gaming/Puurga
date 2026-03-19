import express from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// Log security events (optional - for monitoring)
router.post('/devtools-detected', async (req, res) => {
  try {
    const { eventType, userId, userAgent, timestamp, url } = req.body;
    
    // Log to security table (you'd need to create this)
    console.warn('Perga Security Event:', {
      eventType,
      userId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      url,
      timestamp: timestamp || new Date().toISOString()
    });

    // Store in database for super admin alerts
    await supabase.from('security_events').insert({
      event_type: eventType,
      user_id: userId,
      user_agent: userAgent,
      ip: req.ip,
      url,
      created_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Security logging error:', error);
    res.status(500).json({ error: 'Failed to log security event' });
  }
});

// Content Security Policy endpoint
router.get('/csp-report', async (req, res) => {
  try {
    const report = req.body;
    
    console.warn('Perga CSP Violation:', report);
    
    // Store CSP violations for monitoring
    // await supabase.from('csp_violations').insert({
    //   report,
    //   user_agent: req.get('User-Agent'),
    //   ip: req.ip,
    //   created_at: new Date().toISOString()
    // });

    res.json({ success: true });
  } catch (error) {
    console.error('CSP reporting error:', error);
    res.status(500).json({ error: 'Failed to process CSP report' });
  }
});

export default router;
