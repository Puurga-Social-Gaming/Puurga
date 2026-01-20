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
  credits: number;
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

  // In a real app, you'd fetch the user from an API
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Try to load from localStorage first for faster loading
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
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
            stats: userData.stats ?? { posts: 0, followers: 0, following: 0, puurgas: 0 },
            credits: userData.credits ?? 0,
          } as User;
          setUser(normalized);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }

      // Always fetch fresh data from API
      fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
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
              stats: mergedData.stats ?? { posts: 0, followers: 0, following: 0, puurgas: 0 },
              credits: mergedData.credits ?? 0,
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
        const updatedUser = { ...prevUser, ...data };

        // Update localStorage with the new user data
        try {
          const currentStoredUser = JSON.parse(localStorage.getItem('user') || '{}');
          const updatedStoredUser = {
            ...currentStoredUser,
            // Map frontend fields to backend fields for storage
            avatar_url: data.avatar || currentStoredUser.avatar_url,
            cover_photo: data.coverPhoto || currentStoredUser.cover_photo,
            full_name: data.name || currentStoredUser.full_name,
            username: data.username || currentStoredUser.username,
            email: data.email || currentStoredUser.email,
            // Keep frontend fields for immediate use
            ...data
          };
          localStorage.setItem('user', JSON.stringify(updatedStoredUser));
          console.log('Updated localStorage with:', {
            username: updatedStoredUser.username,
            name: updatedStoredUser.name,
            full_name: updatedStoredUser.full_name
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