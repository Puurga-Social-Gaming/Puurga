import { requireSupabase } from '../config/supabase';
import { areFriends } from '../utils/friendRelations';
import { Profile, FriendRequest, UserSettings, Op } from '../models';

export type MessageRequestSetting = 'everyone' | 'followers' | 'none';

/**
 * Check if sender can send a message to recipient based on recipient's settings.
 * Resolves against the LOCAL Postgres database.
 */
export async function canSendMessage(senderId: string, recipientId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const recipientProfile = await Profile.findOne({
      where: { id: recipientId },
      attributes: ['id', 'message_requests'],
    });

    if (!recipientProfile) {
      return { allowed: false, reason: 'Recipient not found' };
    }

    const messageSetting: MessageRequestSetting = (recipientProfile as any).message_requests || 'everyone';

    switch (messageSetting) {
      case 'everyone':
        return { allowed: true };

      case 'none':
        return { allowed: false, reason: 'This user is not accepting messages' };

      case 'followers': {
        // Friends can always message
        if (await areFriends(senderId, recipientId)) {
          return { allowed: true };
        }

        // Also allow if a friend request is pending either way
        const pendingRequest = await FriendRequest.findOne({
          where: {
            [Op.or]: [
              { sender_id: senderId, receiver_id: recipientId },
              { sender_id: recipientId, receiver_id: senderId },
            ],
          },
          attributes: ['status'],
        });

        if (pendingRequest && (!pendingRequest.status || pendingRequest.status === 'pending')) {
          return { allowed: true };
        }

        return { allowed: false, reason: 'You must be friends to message this user' };
      }

      default:
        return { allowed: true };
    }
  } catch (error) {
    console.error('Error checking message permissions:', error);
    return { allowed: false, reason: 'Unable to verify permissions' };
  }
}

/**
 * Check if user's profile should be visible to viewer based on privacy settings
 */
export async function isProfileVisible(profileUserId: string, viewerId?: string): Promise<{ visible: boolean; reason?: string }> {
  try {
    const supabase = requireSupabase();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, is_private')
      .eq('id', profileUserId)
      .single();

    if (error || !profile) {
      return { visible: false, reason: 'Profile not found' };
    }

    // If viewer is the profile owner, always visible
    if (viewerId === profileUserId) {
      return { visible: true };
    }

    // If profile is public, it's visible
    if (!profile.is_private) {
      return { visible: true };
    }

    // If profile is private and viewer is the same, visible
    if (viewerId === profileUserId) {
      return { visible: true };
    }

    // If private, check if viewer is a friend
    if (viewerId) {
      const { data: friendship } = await supabase
        .from('friends')
        .select('id')
        .or(`and(user_id_1.eq.${viewerId},user_id_2.eq.${profileUserId}),and(user_id_1.eq.${profileUserId},user_id_2.eq.${viewerId})`)
        .limit(1);

      if (friendship && friendship.length > 0) {
        return { visible: true };
      }
    }

    return { visible: false, reason: 'This profile is private' };
  } catch (error) {
    console.error('Error checking profile visibility:', error);
    return { visible: false, reason: 'Unable to verify visibility' };
  }
}

/**
 * Check if user allows comments based on their comment privacy setting
 */
export async function canComment(postOwnerId: string, commenterId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = requireSupabase();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, comment_privacy')
      .eq('id', postOwnerId)
      .single();

    if (error || !profile) {
      return { allowed: true }; // Default allow if profile not found
    }

    const commentPrivacy = profile.comment_privacy || 'everyone';

    switch (commentPrivacy) {
      case 'everyone':
        return { allowed: true };
      
      case 'none':
        return { allowed: false, reason: 'Comments are disabled on this post' };
      
      case 'followers':
        // Check if commenter follows post owner
        const { data: friendship } = await supabase
          .from('friends')
          .select('id')
          .or(`and(user_id_1.eq.${commenterId},user_id_2.eq.${postOwnerId}),and(user_id_1.eq.${postOwnerId},user_id_2.eq.${commenterId})`)
          .limit(1);

        if (!friendship || friendship.length === 0) {
          return { allowed: false, reason: 'You must be friends to comment' };
        }
        return { allowed: true };
      
      default:
        return { allowed: true };
    }
  } catch (error) {
    console.error('Error checking comment permissions:', error);
    return { allowed: true }; // Default allow
  }
}

/**
 * Check if user's online status should be shown to viewer
 */
export async function shouldShowOnlineStatus(targetUserId: string, viewerId?: string): Promise<boolean> {
  try {
    const supabase = requireSupabase();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, show_online_status')
      .eq('id', targetUserId)
      .single();

    if (error || !profile) {
      return true; // Default to showing
    }

    // Always show own online status to self
    if (viewerId === targetUserId) {
      return true;
    }

    return profile.show_online_status !== false;
  } catch (error) {
    console.error('Error checking online status visibility:', error);
    return true; // Default to showing
  }
}

/**
 * Check whether a user allows sharing their live typing draft preview.
 * Stored in user_settings.settings.liveTypingPreview; defaults to true.
 * Resolves against the LOCAL Postgres database.
 */
export async function allowsLiveTypingPreview(userId: string): Promise<boolean> {
  try {
    const row = await UserSettings.findOne({
      where: { user_id: userId },
      attributes: ['settings'],
    });
    if (!row) return true;
    return (row as any).settings?.liveTypingPreview !== false;
  } catch (error) {
    console.error('Error checking live typing preview setting:', error);
    return true;
  }
}

/**
 * Check if user should be shown in suggestions
 */
export async function shouldShowInSuggestions(targetUserId: string): Promise<boolean> {
  try {
    const supabase = requireSupabase();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, hide_from_suggestions')
      .eq('id', targetUserId)
      .single();

    if (error || !profile) {
      return true;
    }

    return profile.hide_from_suggestions !== true;
  } catch (error) {
    console.error('Error checking suggestion visibility:', error);
    return true;
  }
}
