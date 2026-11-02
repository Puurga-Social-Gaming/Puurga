import express from 'express';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

// POST /api/crypto/keys — publish own public key (stored on profiles.e2e_public_key)
router.post('/keys', auth, async (req: AuthRequest, res) => {
  try {
    const { publicKey } = req.body || {};
    if (!publicKey || typeof publicKey !== 'object') {
      return res.status(400).json({ error: 'publicKey (JWK object) required' });
    }

    const serialized = JSON.stringify(publicKey);
    await sequelize.query(
      `UPDATE profiles SET e2e_public_key = :serialized, updated_at = NOW() WHERE id = :userId`,
      { replacements: { serialized, userId: req.user.id }, type: QueryTypes.UPDATE }
    );

    res.json({ success: true });
  } catch (error: any) {
    if (error?.original?.code === '42703') {
      // Column not migrated yet
      return res.status(503).json({ error: 'E2E keys column missing. Apply migration.' });
    }
    console.error('crypto keys upsert:', error);
    res.status(500).json({ error: 'Failed to store public key' });
  }
});

// GET /api/crypto/keys/:userId — fetch peer public key
router.get('/keys/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT e2e_public_key FROM profiles WHERE id = :userId`,
      { replacements: { userId: req.params.userId }, type: QueryTypes.SELECT }
    ) as { e2e_public_key: string | null }[];

    const key = rows?.[0]?.e2e_public_key;
    if (key) {
      return res.json({ publicKey: JSON.parse(key) });
    }
    res.json({ publicKey: null });
  } catch (error: any) {
    if (error?.original?.code === '42703') {
      return res.json({ publicKey: null, message: 'E2E keys column missing. Apply migration.' });
    }
    console.error('crypto keys fetch:', error);
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

export default router;
