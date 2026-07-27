import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

// POST /api/crypto/keys — publish own public key
router.post('/keys', auth, async (req: AuthRequest, res) => {
  try {
    const { publicKey } = req.body || {};
    if (!publicKey || typeof publicKey !== 'object') {
      return res.status(400).json({ error: 'publicKey (JWK object) required' });
    }

    const serialized = JSON.stringify(publicKey);
    await supabase.from('user_crypto_keys').upsert({
      user_id: req.user.id,
      public_key: serialized,
      updated_at: new Date().toISOString(),
    });

    // Mirror on profiles for convenience
    await supabase
      .from('profiles')
      .update({ e2e_public_key: serialized })
      .eq('id', req.user.id);

    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === '42P01' || error?.code === '42703') {
      return res.status(503).json({ error: 'E2E keys table missing. Apply migration.' });
    }
    console.error('crypto keys upsert:', error);
    res.status(500).json({ error: 'Failed to store public key' });
  }
});

// GET /api/crypto/keys/:userId — fetch peer public key
router.get('/keys/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { data } = await supabase
      .from('user_crypto_keys')
      .select('public_key')
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.public_key) {
      return res.json({ publicKey: JSON.parse(data.public_key) });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('e2e_public_key')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.e2e_public_key) {
      return res.json({ publicKey: JSON.parse(profile.e2e_public_key) });
    }

    res.json({ publicKey: null });
  } catch (error) {
    console.error('crypto keys fetch:', error);
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

export default router;
