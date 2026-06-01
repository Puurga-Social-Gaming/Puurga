import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useWebSocket } from '../hooks/useWebSocket';
import { websocketService } from '../services/websocketService';

// Types
export type AccountStatus = 'active' | 'warned' | 'penalized' | 'restricted';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string | null;
  coverPhoto?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  createdAt: string;
  role?: 'user' | 'admin' | 'super_admin' | 'superadmin' | 'business';
  isBlocked?: boolean;
  isOnline?: boolean;
  isFriend?: boolean;
  // from UserProfile
  occupation?: string;
  education?: string;
  relationship?: string;
  isPrivate?: boolean;
  hideFromSuggestions?: boolean;
  messageRequests?: 'everyone' | 'followers' | 'none';
  showReadReceipts?: boolean;
  showOnlineStatus?: boolean;
  commentPrivacy?: 'everyone' | 'followers' | 'none';
  storyPrivacy?: 'everyone' | 'followers' | 'close_friends';
  isVerified?: boolean;
  joinDate?: string;
  postCount?: number;
  totalLikes?: number;
  stats?: {
    followers: number;
    following: number;
    posts: number;
    puurgas: number;
    purges: number;
    credits: number;
  };
  credits: number;
  purga_points?: number;
  isGhost?: boolean;
  purgeCount?: number;
  // Credit system fields
  accountStatus?: AccountStatus;
  inactivityLevel?: number;
  lastActiveAt?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (data: Partial<User>) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => { },
  updateUser: () => { },
  loading: true,
});

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const initializeUser = async () => {
      // First check Supabase session to ensure we have the correct user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // Fallback: check if we have a token in localStorage from a previous session
        // This handles cases where Supabase session hasn't restored yet on page load
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          console.log('Restoring user from localStorage fallback');
          try {
            const userData = JSON.parse(storedUser);
            const normalized = {
              id: userData.id,
              name: userData.full_name ?? userData.name ?? '',
              username: userData.username ?? '',
              email: userData.email ?? '',
              avatar: userData.avatar_url ?? userData.avatar ?? null,
              coverPhoto: userData.cover_photo ?? userData.coverPhoto ?? null,
              bio: userData.bio ?? '',
              location: userData.location ?? '',
              website: userData.website ?? '',
              createdAt: userData.created_at ?? userData.createdAt ?? new Date().toISOString(),
              role: userData.role ?? 'user',
              isBlocked: userData.is_blocked ?? false,
              isOnline: userData.isOnline ?? false,
              isFriend: userData.isFriend ?? false,
              occupation: userData.occupation ?? '',
              education: userData.education ?? '',
              relationship: userData.relationship ?? '',
              isPrivate: userData.is_private ?? false,
              hideFromSuggestions: userData.hide_from_suggestions ?? false,
              messageRequests: userData.message_requests ?? 'everyone',
              showReadReceipts: userData.show_read_receipts ?? true,
              showOnlineStatus: userData.show_online_status ?? true,
              commentPrivacy: userData.comment_privacy ?? 'everyone',
              storyPrivacy: userData.story_privacy ?? 'everyone',
              isVerified: userData.isVerified ?? false,
              joinDate: userData.joinDate ?? userData.created_at ?? undefined,
              postCount: userData.postCount ?? 0,
              totalLikes: userData.totalLikes ?? 0,
              stats: userData.stats ?? { posts: 0, followers: 0, following: 0, puurgas: 0, purges: 0, credits: userData.purga_points ?? userData.credits ?? 0 },
              credits: userData.purga_points ?? userData.credits ?? 0,
              purga_points: userData.purga_points ?? userData.credits ?? 0,
              isGhost: userData.is_ghost ?? userData.isGhost ?? false,
              purgeCount: userData.purge_count ?? userData.purgeCount ?? 0,
            } as User;
            setUser(normalized);
            setLoading(false);
            return;
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
        
        console.log('No valid Supabase session found, clearing local data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      const token = session.access_token;
      if (token) {
        // Update localStorage with current session token
        localStorage.setItem('token', token);

        // Try to load from localStorage first for faster loading
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            // Verify that stored user matches current session user
            if (userData.id === session.user.id) {
              // Normalize stored data
              const normalized = {
                id: userData.id,
                name: userData.full_name ?? userData.name ?? '',
                username: userData.username ?? '',
                email: userData.email ?? '',
                avatar: userData.avatar_url ?? userData.avatar ?? null,
                coverPhoto: userData.cover_photo ?? userData.coverPhoto ?? null,
                bio: userData.bio ?? '',
                location: userData.location ?? '',
                website: userData.website ?? '',
                createdAt: userData.created_at ?? userData.createdAt ?? new Date().toISOString(),
                role: userData.role ?? 'user',
                isBlocked: userData.is_blocked ?? false,
                isOnline: userData.isOnline ?? false,
                isFriend: userData.isFriend ?? false,
                occupation: userData.occupation ?? '',
                education: userData.education ?? '',
                relationship: userData.relationship ?? '',
                isPrivate: userData.is_private ?? false,
                hideFromSuggestions: userData.hide_from_suggestions ?? false,
                messageRequests: userData.message_requests ?? 'everyone',
                showReadReceipts: userData.show_read_receipts ?? true,
                showOnlineStatus: userData.show_online_status ?? true,
                commentPrivacy: userData.comment_privacy ?? 'everyone',
                storyPrivacy: userData.story_privacy ?? 'everyone',
                isVerified: userData.isVerified ?? false,
                joinDate: userData.joinDate ?? userData.created_at ?? undefined,
                postCount: userData.postCount ?? 0,
                totalLikes: userData.totalLikes ?? 0,
                stats: userData.stats ?? { posts: 0, followers: 0, following: 0, puurgas: 0, purges: 0, credits: userData.purga_points ?? userData.credits ?? 0 },
                credits: userData.purga_points ?? userData.credits ?? 0,
                purga_points: userData.purga_points ?? userData.credits ?? 0,
                isGhost: userData.is_ghost ?? userData.isGhost ?? false,
                purgeCount: userData.purge_count ?? userData.purgeCount ?? 0,
              } as User;
              setUser(normalized);
            } else {
              // User mismatch, clear stored data
              localStorage.removeItem('user');
            }
          } catch (error) {
            console.error('Error parsing stored user data:', error);
            localStorage.removeItem('user');
          }
        }

        // Always fetch fresh data from API to ensure correct user
        try {
          const res = await fetch('/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            console.log('Raw profile data from API:', {
              avatar: data.avatar,
              avatar_url: data.avatar_url,
              cover_photo: data.cover_photo,
              coverPhoto: data.coverPhoto
            });

            // Merge with stored data to preserve images if API doesn't return them
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const mergedData = {
              ...data,
              // Preserve stored images if API doesn't have them
              avatar_url: data.avatar_url || storedUser.avatar_url || storedUser.avatar,
              cover_photo: data.cover_photo || storedUser.cover_photo || storedUser.coverPhoto
            };

            // Store merged data in localStorage for persistence
            localStorage.setItem('user', JSON.stringify(mergedData));

            // Normalize backend profile payload (snake_case) to frontend User shape (camelCase)
            const normalized = {
              id: mergedData.id,
              name: mergedData.full_name ?? mergedData.name ?? '',
              username: mergedData.username ?? '',
              email: mergedData.email ?? '',
              avatar: mergedData.avatar_url ?? mergedData.avatar ?? null,
              coverPhoto: mergedData.cover_photo ?? mergedData.coverPhoto ?? null,
              bio: mergedData.bio ?? '',
              location: mergedData.location ?? '',
              website: mergedData.website ?? '',
              createdAt: mergedData.created_at ?? mergedData.createdAt ?? new Date().toISOString(),
              role: mergedData.role ?? 'user',
              isBlocked: mergedData.is_blocked ?? false,
              isOnline: mergedData.isOnline ?? false,
              isFriend: mergedData.isFriend ?? false,
              occupation: mergedData.occupation ?? '',
              education: mergedData.education ?? '',
              relationship: mergedData.relationship ?? '',
              isPrivate: mergedData.is_private ?? false,
              hideFromSuggestions: mergedData.hide_from_suggestions ?? false,
              messageRequests: mergedData.message_requests ?? 'everyone',
              showReadReceipts: mergedData.show_read_receipts ?? true,
              showOnlineStatus: mergedData.show_online_status ?? true,
              commentPrivacy: mergedData.comment_privacy ?? 'everyone',
              storyPrivacy: mergedData.story_privacy ?? 'everyone',
              isVerified: mergedData.isVerified ?? false,
              joinDate: mergedData.joinDate ?? mergedData.created_at ?? undefined,
              postCount: mergedData.postCount ?? 0,
              totalLikes: mergedData.totalLikes ?? 0,
              stats: mergedData.stats ?? { posts: 0, followers: 0, following: 0, puurgas: 0, purges: 0, credits: mergedData.purga_points ?? mergedData.credits ?? 0 },
              credits: mergedData.purga_points ?? mergedData.credits ?? 0,
              purga_points: mergedData.purga_points ?? mergedData.credits ?? 0,
              isGhost: mergedData.is_ghost ?? mergedData.isGhost ?? false,
              purgeCount: mergedData.purge_count ?? mergedData.purgeCount ?? 0,
            } as User;

            console.log('Profile data loaded:', {
              id: normalized.id,
              name: normalized.name,
              username: normalized.username,
              email: normalized.email
            });
            setUser(normalized);
          }
        } catch (error) {
          console.error('Error fetching fresh user data:', error);
        }
      }
      setLoading(false);
    };

    initializeUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      console.log('Auth state changed:', event, session?.user?.id);
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Update the stored token so axios always sends the fresh JWT
        if (session?.access_token) {
          localStorage.setItem('token', session.access_token);
          console.log('Token refreshed and updated in localStorage');
        }
        localStorage.removeItem('user'); // Triggers re-fetch of profile on next initializeUser
      }
      if (session && event !== 'SIGNED_OUT') {
        // Re-initialize user when auth state changes
        initializeUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Set up WebSocket for real-time updates to user data
  useWebSocket({
    onCreditUpdate: (payload) => {
      if (user && payload.userId === user.id) {
        console.log('Global credit sync:', payload.credits);
        updateUser({ credits: payload.credits });
      }
    },
    onProfileUpdate: (payload) => {
      if (user && payload.userId === user.id) {
        console.log('Global profile update (ghost mode):', payload);
        updateUser({ isGhost: payload.isGhost, purgeCount: payload.purgeCount });
      }
    }
  });

  // Update websocketService when user changes (for message filtering)
  useEffect(() => {
    websocketService.setCurrentUserId(user?.id || null);
  }, [user?.id]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        // Merge the updated data with previous user state
        const updatedUser = { ...prevUser, ...data };

        // Update localStorage with the new user data
        try {
          const currentStoredUser = JSON.parse(localStorage.getItem('user') || '{}');

          // Build updated storage object with both frontend and backend field names
          const updatedStoredUser = {
            ...currentStoredUser,
            // Explicitly set all relevant fields from the update
            ...data,
            // Map frontend fields to backend fields for storage consistency
            // Avatar: support both 'avatar' and 'avatar_url'
            avatar: data.avatar ?? currentStoredUser.avatar ?? currentStoredUser.avatar_url,
            avatar_url: data.avatar ?? currentStoredUser.avatar_url ?? currentStoredUser.avatar,
            // Cover photo: support both 'coverPhoto' and 'cover_photo'
            coverPhoto: data.coverPhoto ?? currentStoredUser.coverPhoto ?? currentStoredUser.cover_photo,
            cover_photo: data.coverPhoto ?? currentStoredUser.cover_photo ?? currentStoredUser.coverPhoto,
            // Other fields
            full_name: data.name ?? currentStoredUser.full_name ?? currentStoredUser.name,
            name: data.name ?? currentStoredUser.name ?? currentStoredUser.full_name,
            username: data.username ?? currentStoredUser.username,
            email: data.email ?? currentStoredUser.email,
          };

          localStorage.setItem('user', JSON.stringify(updatedStoredUser));
          console.log('Updated localStorage with:', {
            avatar: updatedStoredUser.avatar,
            avatar_url: updatedStoredUser.avatar_url,
            coverPhoto: updatedStoredUser.coverPhoto,
            cover_photo: updatedStoredUser.cover_photo,
          });
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }

        return updatedUser;
      }
      return null;
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}; 