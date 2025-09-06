import { supabase } from '../lib/supabaseClient';

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

export const acceptFriendRequest = async (senderId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('friends')
    .insert([
      { user_id: senderId, friend_id: user.id },
      { user_id: user.id, friend_id: senderId }
    ]);

  if (error) throw error;
};

export const rejectFriendRequest = async (senderId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('sender_id', senderId)
    .eq('receiver_id', user.id);

  if (error) throw error;
}; 