import express from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import { ChangelogService } from '../services/changelogService';

const router = express.Router();

/**
 * GET /api/changelog
 * Full changelog history for the "What's New" page.
 */
router.get('/', auth, async (_req: AuthRequest, res) => {
  try {
    const entries = await ChangelogService.listEntries(50);
    res.json({ entries });
  } catch (error: any) {
    console.error('Error fetching changelog:', error);
    res.status(500).json({ error: 'Failed to fetch changelog' });
  }
});

export default router;
