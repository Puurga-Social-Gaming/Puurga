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
              name: data.full_name ?? data.name,
              username: data.username,
              email: data.email,
              avatar: data.avatar ?? data.avatar_url ?? null,
              coverPhoto: data.coverPhoto ?? data.cover_photo ?? null,
              bio: data.bio ?? null,
              location: data.location ?? null,
              website: data.website ?? null,
              createdAt: data.created_at ?? data.createdAt ?? new Date().toISOString(),
              role: data.role,
              isBlocked: data.isBlocked,
              isOnline: data.isOnline,
              isFriend: data.isFriend,
              occupation: data.occupation,
              education: data.education,
              relationship: data.relationship,
              isPrivate: data.isPrivate,
              hideFromSuggestions: data.hideFromSuggestions,
              messageRequests: data.messageRequests,
              showReadReceipts: data.showReadReceipts,
              showOnlineStatus: data.showOnlineStatus,
              commentPrivacy: data.commentPrivacy,
              storyPrivacy: data.storyPrivacy,
              isVerified: data.isVerified,
              joinDate: data.joinDate ?? data.created_at ?? undefined,
              postCount: data.postCount,
              totalLikes: data.totalLikes,
              stats: data.stats,
            } as User;
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