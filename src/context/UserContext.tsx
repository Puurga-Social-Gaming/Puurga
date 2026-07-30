import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useWebSocket } from '../hooks/useWebSocket';
import { websocketService } from '../services/websocketService';
import { normalizeAppUser } from '../utils/userProfile';
import { showCreditToast } from '../components/Credits/CreditChangeToast';
import toast from 'react-hot-toast';

// Flag to prevent duplicate toasts between useCredits API calls and WebSocket events
let _creditApiPending = false;
export function setCreditApiPending(value: boolean) { _creditApiPending = value; }

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
  // Certifications (Super Admin granted)
  certificationSlug?: string | null;
  logoCertified?: boolean;
  // Credit system fields
  accountStatus?: AccountStatus;
  inactivityLevel?: number;
  lastActiveAt?: string;
  // XP / Progression fields
  xp?: number;
  level?: number;
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
            const normalized = normalizeAppUser(userData);
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
              setUser(normalizeAppUser(userData));
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

            const normalized = normalizeAppUser(mergedData);

            console.log('Profile data loaded:', {
              id: normalized.id,
              name: normalized.name,
              username: normalized.username,
              email: normalized.email
            });
            setUser((prev) => {
              // Skip update if nothing meaningful changed — avoids avatar remount flicker
              if (
                prev &&
                prev.id === normalized.id &&
                prev.avatar === normalized.avatar &&
                prev.coverPhoto === normalized.coverPhoto &&
                prev.name === normalized.name &&
                prev.username === normalized.username &&
                prev.credits === normalized.credits
              ) {
                return prev;
              }
              return normalized;
            });
          }
        } catch (error) {
          console.error('Error fetching fresh user data:', error);
        }
      }
      setLoading(false);
    };

    initializeUser();

    // Listen for auth state changes — avoid re-fetch loops that make avatars blink
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // Keep existing profile in memory; only refresh the JWT for axios
        if (session?.access_token) {
          localStorage.setItem('token', session.access_token);
        }
        return;
      }

      // Only re-load profile on real sign-in / user metadata updates
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
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

        // Show toast for backend-initiated credit changes (not from useCredits API calls)
        if (!_creditApiPending && payload.change && payload.change !== 0) {
          const source = payload.source || 'unknown';
          const toastData = {
            amount: payload.change,
            source,
            newBalance: payload.credits,
          };
          toast.success(showCreditToast(toastData), { duration: 4000, icon: payload.change > 0 ? '🪙' : undefined });
        }
      }
    },
    onProfileUpdate: (payload) => {
      if (user && payload.userId === user.id) {
        console.log('Global profile update (ghost mode):', payload);
        updateUser({ isGhost: payload.isGhost, purgeCount: payload.purgeCount });
      }
    },
    onXpUpdate: (payload) => {
      if (user && payload.userId === user.id) {
        console.log('XP update:', payload.xp, 'Level:', payload.level);
        updateUser({ xp: payload.xp, level: payload.level });
      }
    },
    onLevelUp: (payload) => {
      if (user && payload.userId === user.id) {
        console.log('Level up!', payload.level, payload.title);
        updateUser({ level: payload.level });
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