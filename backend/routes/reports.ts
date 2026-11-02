import express from 'express';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import { supabaseAuth, supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { superAdminAuth } from '../middleware/superAdminAuth';
import { logSuperAdminAction } from '../utils/auditLogger';

const router = express.Router();

const TARGET_TYPES = ['post', 'comment', 'message', 'user'] as const;
type TargetType = (typeof TARGET_TYPES)[number];

const REASONS = [
  'spam_or_scam',
  'harassment_or_bullying',
  'hate_speech',
  'violence_or_dangerous',
  'sexual_content',
  'misinformation',
  'illegal_goods_or_services',
  'other',
] as const;

// POST /api/reports — report a post / comment / message / user
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body || {};
    const reporterId = req.user.id;

    if (!TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({ error: `targetType must be one of: ${TARGET_TYPES.join(', ')}` });
    }
    if (typeof reason !== 'string' || !REASONS.includes(reason as any)) {
      return res.status(400).json({ error: `reason must be one of: ${REASONS.join(', ')}` });
    }

    // Prevent obviously self-destructive reports
    if (targetType === 'user' && targetId === reporterId) {
      return res.status(400).json({ error: 'You cannot report your own account' });
    }

    // Verify the target actually exists (prevents junk rows)
    const table =
      targetType === 'post' ? 'posts' :
      targetType === 'comment' ? 'comments' :
      targetType === 'message' ? 'messages' : 'users';

    const found = await sequelize.query(
      `SELECT 1 FROM ${table} WHERE id = :targetId LIMIT 1`,
      { replacements: { targetId }, type: QueryTypes.SELECT }
    );
    if (!found.length) {
      return res.status(404).json({ error: `${targetType} not found` });
    }

    const inserted = await sequelize.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
       VALUES (:reporterId, :targetType, :targetId, :reason, :details)
       ON CONFLICT (reporter_id, target_type, target_id) WHERE status = 'open'
       DO NOTHING
       RETURNING id, created_at`,
      {
        replacements: {
          reporterId,
          targetType,
          targetId,
          reason,
          details: typeof details === 'string' ? details.slice(0, 2000) : null,
        },
        type: QueryTypes.INSERT,
      }
    ) as unknown as { id: string; created_at: string }[][];

    const row = inserted?.[0]?.[0];
    if (!row) {
      // ON CONFLICT DO NOTHING hit an existing open report
      return res.status(200).json({ message: 'Already reported — our team is reviewing it' });
    }

    res.status(201).json({ message: 'Report submitted. Thank you — our team will review it.', reportId: row.id });
  } catch (error: any) {
    // 22P02 = invalid uuid text representation → treat as bad request
    const code = error?.parent?.code || error?.original?.code;
    if (code === '22P02') {
      return res.status(400).json({ error: 'Invalid targetId' });
    }
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// GET /api/reports — list reports (super admin / moderators)
router.get('/', supabaseAuth, superAdminAuth, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
    const status = ['open', 'resolved', 'dismissed'].includes(String(req.query.status))
      ? String(req.query.status)
      : 'open';

    const rows = await sequelize.query(
      `SELECT r.*, u.username AS reporter_username, pu.username AS target_username
       FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       LEFT JOIN users pu ON pu.id = r.target_id AND r.target_type = 'user'
       WHERE r.status = :status
       ORDER BY r.created_at DESC
       LIMIT :limit`,
      { replacements: { status, limit }, type: QueryTypes.SELECT }
    );

    res.json({ reports: rows });
  } catch (error: any) {
    console.error('List reports error:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

// PATCH /api/reports/:id — resolve or dismiss a report (super admin)
router.patch('/:id', supabaseAuth, superAdminAuth, async (req: AuthRequest, res) => {
  try {
    const { status, resolutionNote } = req.body || {};
    if (!['resolved', 'dismissed', 'open'].includes(status)) {
      return res.status(400).json({ error: 'status must be resolved | dismissed | open' });
    }

    const result = await sequelize.query(
      `UPDATE reports
       SET status = :status,
           resolved_by = :resolvedBy,
           resolution_note = :note,
           updated_at = NOW()
       WHERE id = :id
       RETURNING id, status`,
      {
        replacements: {
          status,
          resolvedBy: req.user.id,
          note: typeof resolutionNote === 'string' ? resolutionNote.slice(0, 2000) : null,
          id: req.params.id,
        },
        type: QueryTypes.SELECT,
      }
    ) as { id: string; status: string }[];

    if (!result.length) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await logSuperAdminAction({
      superadminId: req.user.id,
      action: status === 'resolved' ? 'RESOLVE_REPORT' : 'DISMISS_REPORT',
      targetId: String(req.params.id),
      targetType: 'report',
      details: { status, resolutionNote },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Report updated', report: result[0] });
  } catch (error: any) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

export default router;
