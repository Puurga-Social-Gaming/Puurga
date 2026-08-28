import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// Make Supabase optional during migration to local PostgreSQL
const hasSupabaseConfig = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!hasSupabaseConfig) {
  console.log('⚠️ Supabase environment variables not set - running in local PostgreSQL mode');
}

// Create Supabase client with service role key for admin operations
export const supabase: SupabaseClient | null = hasSupabaseConfig ? createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null;

// Create Supabase admin client
export const supabaseAdmin: SupabaseClient | null = hasSupabaseConfig ? createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null;

// Create Supabase client with anon key for public operations
export const supabasePublic: SupabaseClient | null = hasSupabaseConfig ? createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
) : null;

// Export a flag to check if Supabase is available
export const isSupabaseAvailable = hasSupabaseConfig;

// Noop proxy that returns empty/mock results — prevents crashes when Supabase is not configured.
// All chained Supabase calls (e.g. supabase.from('table').select().eq().single()) will resolve
// to empty results instead of throwing TypeError on null.
function createNoopProxy(): SupabaseClient {
  const noopResult = { data: null, error: null, count: 0, status: 200, statusText: 'OK' };
  const noopArrayResult = { data: [], error: null, count: 0, status: 200, statusText: 'OK' };

  const chainHandler: ProxyHandler<any> = {
    get(_target, _prop, _receiver) {
      if (_prop === 'then') {
        return undefined; // not a thenable — prevents await issues
      }
      if (_prop === Symbol.iterator) {
        return undefined;
      }
      // Return a function that returns the proxy itself for chaining
      return new Proxy(() => noopChainProxy, chainHandler);
    },
    apply(_target, _thisArg, _args) {
      return noopChainProxy;
    }
  };

  const noopChainProxy: any = new Proxy(() => noopChainProxy, chainHandler);

  // Make it awaitable — resolves to empty array
  (noopChainProxy as any)[Symbol.for('nodejs.util.inspect.custom')] = () => '[NoopSupabaseClient]';

  return new Proxy({} as SupabaseClient, {
    get(_target, prop, _receiver) {
      // Handle .auth namespace
      if (prop === 'auth') {
        return new Proxy({}, {
          get(_authTarget, authProp) {
            if (authProp === 'getUser') {
              return async () => ({ data: { user: null }, error: { message: 'Supabase not configured', status: 404 } });
            }
            if (authProp === 'signOut') {
              return async () => ({ error: null });
            }
            return new Proxy(() => ({}), chainHandler);
          }
        });
      }

      // Handle .from('table') — the main entry point
      if (prop === 'from') {
        return (_tableName: string) => {
          // Build a chain that resolves to empty data when .then is called
          const chain: any = {};
          const addChainMethod = (name: string) => {
            chain[name] = (..._args: any[]) => chain;
          };
          ['select', 'insert', 'update', 'upsert', 'delete', 'rpc',
           'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike',
           'in', 'or', 'and', 'not', 'filter', 'order', 'limit', 'offset',
           'range', 'match', 'contains', 'containedBy', 'textSearch',
           'csv', 'geojson', 'head', 'count'
          ].forEach(addChainMethod);

          // Terminal methods
          chain.single = () => Promise.resolve(noopResult);
          chain.maybeSingle = () => Promise.resolve(noopResult);
          chain.then = (resolve: any, reject?: any) => {
            const result = Promise.resolve(noopArrayResult);
            return resolve ? result.then(resolve, reject) : result;
          };
          chain.catch = (cb: any) => Promise.resolve(noopArrayResult).catch(cb);
          chain.finally = (cb: any) => Promise.resolve(noopArrayResult).finally(cb);

          return chain;
        };
      }

      // Handle other top-level methods
      return new Proxy(() => noopResult, chainHandler);
    }
  });
}

const noopSupabaseClient = createNoopProxy();

// Helper function to ensure Supabase is available before use
export const requireSupabase = () => {
  if (!isSupabaseAvailable || !supabase) {
    return noopSupabaseClient;
  }
  return supabase;
};

export const requireSupabaseAdmin = () => {
  if (!isSupabaseAvailable || !supabaseAdmin) {
    return noopSupabaseClient;
  }
  return supabaseAdmin;
};

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
    role: 'user' | 'admin' | 'super_admin' | 'superadmin' | 'business';
    is_private: boolean;
    hide_from_suggestions: boolean;
    message_requests: 'everyone' | 'followers' | 'none';
    show_read_receipts: boolean;
    show_online_status: boolean;
    comment_privacy: 'everyone' | 'followers' | 'none';
    story_privacy: 'everyone' | 'followers' | 'close_friends';
    is_blocked: boolean;
    purga_points?: number;
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
    content?: string;
    media_url?: string;
    type: 'text' | 'media';
    created_at: string;
    expires_at: string;
  };
};