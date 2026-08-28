import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
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
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      // Try to load from localStorage first for fast rendering
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(normalizeAppUser(userData));
        } catch {
          localStorage.removeItem('user');
        }
      }

      // Fetch fresh profile from backend API
      if (storedToken) {
        try {
          const res = await fetch('/api/users/profile', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const data = await res.json();

            // Merge with stored data to preserve images
            const stored = storedUser ? JSON.parse(storedUser) : {};
            const mergedData = {
              ...data,
              avatar_url: data.avatar_url || stored.avatar_url || stored.avatar,
              cover_photo: data.cover_photo || stored.cover_photo || stored.coverPhoto,
            };

            localStorage.setItem('user', JSON.stringify(mergedData));
            const normalized = normalizeAppUser(mergedData);

            setUser((prev) => {
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
          } else if (res.status === 401) {
            // Token expired or invalid — clear
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching fresh user data:', error);
        }
      }

      setLoading(false);
    };

    initializeUser();
  }, []);

  // Set up WebSocket for real-time updates to user data
  useWebSocket({
    onCreditUpdate: (payload) => {
      if (user && payload.userId === user.id) {
        console.log('Global credit sync:', payload.credits);
        updateUser({ credits: payload.credits });

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

  // Update websocketService when user changes
  useEffect(() => {
    websocketService.setCurrentUserId(user?.id || null);
  }, [user?.id]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        const updatedUser = { ...prevUser, ...data };

        try {
          const currentStoredUser = JSON.parse(localStorage.getItem('user') || '{}');
          const updatedStoredUser = {
            ...currentStoredUser,
            ...data,
            avatar: data.avatar ?? currentStoredUser.avatar ?? currentStoredUser.avatar_url,
            avatar_url: data.avatar ?? currentStoredUser.avatar_url ?? currentStoredUser.avatar,
            coverPhoto: data.coverPhoto ?? currentStoredUser.coverPhoto ?? currentStoredUser.cover_photo,
            cover_photo: data.coverPhoto ?? currentStoredUser.cover_photo ?? currentStoredUser.coverPhoto,
            full_name: data.name ?? currentStoredUser.full_name ?? currentStoredUser.name,
            name: data.name ?? currentStoredUser.name ?? currentStoredUser.full_name,
            username: data.username ?? currentStoredUser.username,
            email: data.email ?? currentStoredUser.email,
          };
          localStorage.setItem('user', JSON.stringify(updatedStoredUser));
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
