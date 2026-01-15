import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

// POST /api/test/ghost-mode/enable - Enable ghost mode for current user (testing only)
router.post('/enable', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Set user to ghost mode
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_ghost: true,
        purge_count: 5,
        ghosted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error setting ghost mode:', updateError);
      return res.status(500).json({ error: 'Failed to enable ghost mode' });
    }

    res.json({
      success: true,
      message: 'Ghost mode enabled for testing',
      purgeCount: 5,
      ghostedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error enabling ghost mode:', error);
    res.status(500).json({ error: 'Failed to enable ghost mode' });
  }
});

// POST /api/test/ghost-mode/disable - Disable ghost mode for current user (testing only)
router.post('/disable', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Remove ghost mode
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_ghost: false,
        purge_count: 0,
        ghosted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error disabling ghost mode:', updateError);
      return res.status(500).json({ error: 'Failed to disable ghost mode' });
    }

    // Clear all purges for this user
    await supabase
      .from('purges')
      .delete()
      .eq('target_user_id', userId);

    res.json({
      success: true,
      message: 'Ghost mode disabled'
    });

  } catch (error) {
    console.error('Error disabling ghost mode:', error);
    res.status(500).json({ error: 'Failed to disable ghost mode' });
  }
});

export default router;
