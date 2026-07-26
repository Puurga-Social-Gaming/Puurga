import React, { useState, useEffect } from 'react';
import Avatar from '../Avatar';
import ProfileLink from '../Profile/ProfileLink';
import { useUser, User } from '../../context/UserContext';
import api from '../../api/api';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';

const SuggestedUsers: React.FC = () => {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/friends/suggestions');
        const filteredUsers = response.data
          .filter((u: User) => u.id !== currentUser?.id)
          .slice(0, 5);
        setUsers(filteredUsers);
      } catch (err) {
        console.error('Error fetching suggested users:', err);
        setError('Failed to load suggestions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser?.id]);

  const formatFollowers = (count: number = 0) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-theme-sm">
        <h2 className="text-foreground font-semibold mb-4">Suggested Users</h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-8 h-8 rounded-full bg-card-hover animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-card-hover rounded w-24 animate-pulse" />
                <div className="h-3 bg-card-hover rounded w-16 mt-1 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-theme-sm">
        <h2 className="text-foreground font-semibold mb-4">Suggested Users</h2>
        <p className="text-muted text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-theme-sm">
      <h2 className="text-foreground font-semibold mb-4">Suggested Users</h2>
      <div className="space-y-2">
        {users.length > 0 ? (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors border border-transparent hover:border-border"
            >
              <ProfileLink username={user.username} className="rounded-full shrink-0">
                <Avatar src={user.avatar || DEFAULT_IMAGES.avatar} alt={user.name} size="sm" />
              </ProfileLink>
              <div className="flex-1 min-w-0">
                <ProfileLink username={user.username} className="text-foreground font-medium truncate hover:text-accent block">
                  {user.name}
                </ProfileLink>
                <ProfileLink username={user.username} className="text-muted text-sm truncate hover:text-accent block">
                  @{user.username}
                </ProfileLink>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted">
                  {formatFollowers(user.stats?.followers)} followers
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted text-sm text-center py-2">No suggestions available</p>
        )}
      </div>
    </div>
  );
};

export default SuggestedUsers;
