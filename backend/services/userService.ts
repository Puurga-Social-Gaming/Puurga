import { supabase, supabaseAdmin } from '../config/supabase';
import { Tables } from '../config/supabase';

export type UserProfile = Tables['users'];

export class UserService {
  static async createUser(email: string, password: string, userData: Partial<UserProfile>) {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authUser.user) throw new Error('Failed to create user');

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        full_name: userData.full_name,
        username: userData.username,
        role: 'user',
        is_private: false,
        hide_from_suggestions: false,
        message_requests: 'everyone',
        show_read_receipts: true,
        show_online_status: true,
        comment_privacy: 'everyone',
        story_privacy: 'everyone',
        is_blocked: false,
        ...userData,
      })
      .select()
      .single();

    if (profileError) throw profileError;
    return profile;
  }

  static async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateUser(id: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteUser(id: string) {
    // Delete user profile
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (profileError) throw profileError;

    // Delete auth user (requires admin client)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) throw authError;
  }

  static async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserByUsername(username: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateUserPrivacy(id: string, privacySettings: {
    is_private?: boolean;
    hide_from_suggestions?: boolean;
    message_requests?: 'everyone' | 'followers' | 'none';
    show_read_receipts?: boolean;
    show_online_status?: boolean;
    comment_privacy?: 'everyone' | 'followers' | 'none';
    story_privacy?: 'everyone' | 'followers' | 'close_friends';
  }) {
    const { data, error } = await supabase
      .from('users')
      .update(privacySettings)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProfile(id: string, profileData: {
    full_name?: string;
    bio?: string;
    location?: string;
    website?: string;
    occupation?: string;
    education?: string;
    relationship?: string;
    avatar_url?: string;
    cover_photo?: string;
  }) {
    const { data, error } = await supabase
      .from('users')
      .update(profileData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
} 