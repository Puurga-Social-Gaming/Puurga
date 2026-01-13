import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Types
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
  role?: 'user' | 'admin' | 'super_admin';
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
  };
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (data: Partial<User>) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  updateUser: () => {},
  loading: true,
});

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // In a real app, you'd fetch the user from an API
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            // Normalize backend profile payload (snake_case) to frontend User shape (camelCase)
            const normalized = {
              id: data.id,
              name: data.full_name ?? data.name ?? '',
              username: data.username ?? '',
              email: data.email ?? '',
              avatar: data.avatar ?? data.avatar_url ?? null,
              coverPhoto: data.coverPhoto ?? data.cover_photo ?? null,
              bio: data.bio ?? '',
              location: data.location ?? '',
              website: data.website ?? '',
              createdAt: data.created_at ?? data.createdAt ?? new Date().toISOString(),
              role: data.role ?? 'user',
              isBlocked: data.is_blocked ?? false,
              isOnline: data.isOnline ?? false,
              isFriend: data.isFriend ?? false,
              occupation: data.occupation ?? '',
              education: data.education ?? '',
              relationship: data.relationship ?? '',
              isPrivate: data.is_private ?? false,
              hideFromSuggestions: data.hide_from_suggestions ?? false,
              messageRequests: data.message_requests ?? 'everyone',
              showReadReceipts: data.show_read_receipts ?? true,
              showOnlineStatus: data.show_online_status ?? true,
              commentPrivacy: data.comment_privacy ?? 'everyone',
              storyPrivacy: data.story_privacy ?? 'everyone',
              isVerified: data.isVerified ?? false,
              joinDate: data.joinDate ?? data.created_at ?? undefined,
              postCount: data.postCount ?? 0,
              totalLikes: data.totalLikes ?? 0,
              stats: data.stats ?? { posts: 0, followers: 0, following: 0 },
            } as User;
            
            console.log('Profile data loaded:', {
              id: normalized.id,
              name: normalized.name,
              username: normalized.username,
              email: normalized.email
            });
            setUser(normalized);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        return { ...prevUser, ...data };
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