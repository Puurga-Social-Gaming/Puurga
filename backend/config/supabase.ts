import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend directory
// Load .env file from backend directory (try both source and dist locations)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('Supabase config check:');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '***PRESENT***' : '***MISSING***');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '***PRESENT***' : '***MISSING***');
console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '***PRESENT***' : '***MISSING***');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for admin operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create Supabase admin client
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create Supabase client with anon key for public operations
export const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Types for database tables
export type Tables = {
  users: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    cover_photo?: string;
    bio?: string;
    location?: string;
    website?: string;
    occupation?: string;
    education?: string;
    relationship?: string;
    role: 'user' | 'admin' | 'super_admin' | 'business';
    is_private: boolean;
    hide_from_suggestions: boolean;
    message_requests: 'everyone' | 'followers' | 'none';
    show_read_receipts: boolean;
    show_online_status: boolean;
    comment_privacy: 'everyone' | 'followers' | 'none';
    story_privacy: 'everyone' | 'followers' | 'close_friends';
    is_blocked: boolean;
    perga_points?: number;
    created_at: string;
    updated_at: string;
  };
  posts: {
    id: string;
    user_id: string;
    content: string;
    media_url?: string;
    created_at: string;
    updated_at: string;
    last_edited?: string;
  };
  comments: {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
  };
  likes: {
    id: string;
    post_id: string;
    user_id: string;
    created_at: string;
  };
  followers: {
    id: string;
    follower_id: string;
    following_id: string;
    created_at: string;
  };
  messages: {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
  };
  conversations: {
    id: string;
    created_at: string;
    updated_at: string;
  };
  conversation_participants: {
    id: string;
    conversation_id: string;
    user_id: string;
    created_at: string;
  };
  notifications: {
    id: string;
    receiver_id: string;
    type: string;
    content: string;
    read: boolean;
    created_at: string;
    sender_id?: string;
    post_id?: string;
    comment_id?: string;
  };
  reactions: {
    id: string;
    post_id: string;
    user_id: string;
    type: string;
    created_at: string;
  };
  statuses: {
    id: string;
    user_id: string;
    media_url?: string;
    type: 'text' | 'media';
    created_at: string;
    expires_at: string;
  };
};