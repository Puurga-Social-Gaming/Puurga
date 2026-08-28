import { requireSupabaseAdmin } from '../config/supabase';
import { getCreditSchemaSupport } from '../lib/creditSchema';
import { wsManager } from '../websocketManager';
import { CreditService } from './creditService';

const INACTIVITY_CONFIG = {
  WARN_THRESHOLD_DAYS: 5,
  PENALIZED_THRESHOLD_DAYS: 7,
  RESTRICTED_THRESHOLD_DAYS: 14,
  DISABLED_THRESHOLD_DAYS: 40,
  GHOST_DURATION_DAYS: 60,
  PENALTY_INTERVAL_HOURS: 48,
};

interface InactivityResult {
  userId: string;
  previousStatus: string;
  newStatus: string;
  inactivityLevel: number;
  penalty: number;
  daysInactive: number;
}

export class InactivityService {
  private static running = false;
  private static intervalId: NodeJS.Timeout | null = null;
  private static schedulerEnabled = false;

  static async startScheduler(intervalHours: number = 24): Promise<void> {
    if (this.intervalId) {
      console.log('InactivityService: Scheduler already running');
      return;
    }

    const schema = await getCreditSchemaSupport();
    const lastActiveCol = schema.lastActiveColumn;
    this.schedulerEnabled = true;

    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.checkInactiveUsers();
      this.checkGhostExpiry();
    }, intervalMs);

    console.log(
      `InactivityService: Scheduler started (every ${intervalHours} hours, activity column: ${lastActiveCol})`
    );

    setTimeout(() => {
      this.checkInactiveUsers();
      this.checkGhostExpiry();
    }, 5000);
  }

  static stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('InactivityService: Scheduler stopped');
    }
  }

  static async checkInactiveUsers(): Promise<InactivityResult[]> {
    if (this.running) {
      console.log('InactivityService: Already running, skipping...');
      return [];
    }

    this.running = true;
    const results: InactivityResult[] = [];

    try {
      if (!this.schedulerEnabled) {
        return results;
      }

      console.log('InactivityService: Checking inactive users...');
      const supabaseAdminClient = requireSupabaseAdmin();
      const schema = await getCreditSchemaSupport();
      const lastActiveCol = schema.lastActiveColumn;
      const selectCols = schema.hasInactivityColumns
        ? `id, ${lastActiveCol}, inactivity_level, account_status, purga_points, is_restricted`
        : `id, ${lastActiveCol}, purga_points, is_restricted`;

      const { data: profiles, error } = await supabaseAdminClient.from('profiles').select(selectCols);

      if (error) {
        console.error('InactivityService: Error fetching profiles', error);
        return results;
      }

      const now = new Date();

      for (const profile of profiles || []) {
        try {
          const result = await this.processUserInactivity(profile as any, now, schema);
          if (result) {
            results.push(result);
          }
        } catch (userError) {
          console.error(`InactivityService: Error processing user ${(profile as { id?: string }).id}`, userError);
        }
      }

      console.log(`InactivityService: Processed ${results.length} users`);
    } catch (error) {
      console.error('InactivityService: Error checking inactive users', error);
    } finally {
      this.running = false;
    }

    return results;
  }

  static async checkGhostExpiry(): Promise<void> {
    try {
      console.log('InactivityService: Checking ghost expiry...');
      const supabaseAdminClient = requireSupabaseAdmin();

      const { data: ghostedProfiles, error } = await supabaseAdminClient
        .from('profiles')
        .select('id, ghosted_at')
        .eq('is_ghost', true)
        .not('ghosted_at', 'is', null);

      if (error) {
        console.error('InactivityService: Error fetching ghosted profiles', error);
        return;
      }

      const now = new Date();
      const ghostDurationMs = INACTIVITY_CONFIG.GHOST_DURATION_DAYS * 24 * 60 * 60 * 1000;

      for (const profile of ghostedProfiles || []) {
        const ghostedAt = new Date(profile.ghosted_at);
        const timeSinceGhosted = now.getTime() - ghostedAt.getTime();

        if (timeSinceGhosted >= ghostDurationMs) {
          console.log(`InactivityService: Unghosting user ${profile.id} (ghost duration expired)`);

          await supabaseAdminClient
            .from('profiles')
            .update({
              is_ghost: false,
              ghosted_at: null,
              account_status: 'active',
            })
            .eq('id', profile.id);

          wsManager.sendToUser(profile.id, {
            type: 'profile_update',
            payload: {
              userId: profile.id,
              isGhost: false,
              message: 'Your ghost period has expired. Welcome back!',
            },
          });
        }
      }
    } catch (error) {
      console.error('InactivityService: Error checking ghost expiry', error);
    }
  }

  private static async processUserInactivity(
    profile: Record<string, unknown>,
    now: Date,
    schema: Awaited<ReturnType<typeof getCreditSchemaSupport>>
  ): Promise<InactivityResult | null> {
    const supabaseAdminClient = requireSupabaseAdmin();
    const userId = profile.id as string;
    const lastActiveRaw = profile[schema.lastActiveColumn] as string | null | undefined;
    const lastActive = lastActiveRaw ? new Date(lastActiveRaw) : null;
    const previousStatus = schema.hasInactivityColumns
      ? ((profile.account_status as string) || 'active')
      : profile.is_restricted
        ? 'restricted'
        : 'active';
    const previousLevel = schema.hasInactivityColumns ? Number(profile.inactivity_level || 0) : 0;

    if (!lastActive) {
      const seedUpdate: Record<string, unknown> = {
        [schema.lastActiveColumn]: now.toISOString(),
      };
      if (schema.hasInactivityColumns) {
        seedUpdate.inactivity_level = 0;
        seedUpdate.account_status = 'active';
      } else {
        seedUpdate.is_restricted = false;
      }
      await supabaseAdminClient.from('profiles').update(seedUpdate).eq('id', userId);

      return null;
    }

    const hoursInactive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
    const daysInactive = hoursInactive / 24;

    let newLevel = 0;
    let newStatus = 'active';
    let penalty = 0;

    if (daysInactive >= INACTIVITY_CONFIG.DISABLED_THRESHOLD_DAYS) {
      newLevel = 4;
      newStatus = 'disabled';
      penalty = 0;
    } else if (daysInactive >= INACTIVITY_CONFIG.RESTRICTED_THRESHOLD_DAYS) {
      newLevel = 3;
      newStatus = 'restricted';
      penalty = INACTIVITY_CONFIG.PENALTY_INTERVAL_HOURS >= 48 ? 15 : 0;
    } else if (daysInactive >= INACTIVITY_CONFIG.PENALIZED_THRESHOLD_DAYS) {
      newLevel = 2;
      newStatus = 'penalized';
      penalty = INACTIVITY_CONFIG.PENALTY_INTERVAL_HOURS >= 48 ? 10 : 0;
    } else if (daysInactive >= INACTIVITY_CONFIG.WARN_THRESHOLD_DAYS) {
      newLevel = 1;
      newStatus = 'warned';
      penalty = INACTIVITY_CONFIG.PENALTY_INTERVAL_HOURS >= 48 ? 5 : 0;
    }

    if (newLevel === previousLevel && newStatus === previousStatus) {
      return null;
    }

    if (penalty > 0) {
      await CreditService.deductCredits(userId, penalty, 'inactivity', `Inactivity penalty (${newStatus})`);
      
      wsManager.sendToUser(userId, {
        type: 'notification',
        payload: {
          id: `inactivity_${Date.now()}`,
          type: 'penalty',
          fromUser: {
            id: 'system',
            name: 'Puurga System',
            username: 'system',
          },
          data: {
            message: `Account status changed to ${newStatus}. ${penalty} credits deducted for inactivity.`,
          },
          createdAt: new Date().toISOString(),
        },
      } as any);
    }

    const statusUpdate: Record<string, unknown> = {};
    if (schema.hasInactivityColumns) {
      statusUpdate.inactivity_level = newLevel;
      statusUpdate.account_status = newStatus;
    }
    statusUpdate.is_restricted = newStatus === 'restricted' || newStatus === 'disabled';
    await supabaseAdminClient.from('profiles').update(statusUpdate).eq('id', userId);

    return {
      userId,
      previousStatus,
      newStatus,
      inactivityLevel: newLevel,
      penalty,
      daysInactive,
    };
  }

  static async onUserActivity(userId: string): Promise<{ bonusAwarded: boolean; previousLevel: number }> {
    try {
      const supabaseAdminClient = requireSupabaseAdmin();
      const schema = await getCreditSchemaSupport();
      const lastActiveCol = schema.lastActiveColumn;
      const selectCols = schema.hasInactivityColumns
        ? `inactivity_level, account_status, ${lastActiveCol}, is_restricted`
        : `${lastActiveCol}, is_restricted`;

      const { data: profile } = await supabaseAdminClient
        .from('profiles')
        .select(selectCols)
        .eq('id', userId)
        .single();

      if (!profile) {
        return { bonusAwarded: false, previousLevel: 0 };
      }

      const row = profile as unknown as Record<string, unknown>;
      const previousLevel = schema.hasInactivityColumns ? Number(row.inactivity_level || 0) : 0;
      const isInactive =
        previousLevel > 0 ||
        Boolean(row.is_restricted) ||
        (schema.hasInactivityColumns && row.account_status !== 'active');

      const activityUpdate: Record<string, unknown> = {
        [lastActiveCol]: new Date().toISOString(),
        is_restricted: false,
      };
      if (schema.hasInactivityColumns) {
        activityUpdate.inactivity_level = 0;
        activityUpdate.account_status = 'active';
      }
      await supabaseAdminClient.from('profiles').update(activityUpdate).eq('id', userId);

      let bonusAwarded = false;
      if (isInactive && previousLevel >= 1) {
        await CreditService.awardCredits(userId, 10, 'recovery_bonus', 'Recovery bonus - welcome back!');
        bonusAwarded = true;

        wsManager.sendToUser(userId, {
          type: 'notification',
          payload: {
            id: `recovery_${Date.now()}`,
            type: 'bonus',
            fromUser: {
              id: 'system',
              name: 'Puurga System',
              username: 'system',
            },
            data: {
              message: 'Welcome back! 10 credits bonus awarded for returning after inactivity.',
            },
            createdAt: new Date().toISOString(),
          },
        } as any);
      }

      return { bonusAwarded, previousLevel };
    } catch (error) {
      console.error('InactivityService: Error on user activity', error);
      return { bonusAwarded: false, previousLevel: 0 };
    }
  }
}