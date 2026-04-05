import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from './useWebSocket';

export const useOnlineStatus = () => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const { isUserOnline: wsIsUserOnline, getOnlineUsers } = useWebSocket({
    onUserStatusChange: (status) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (status.isOnline) {
          newSet.add(status.userId);
        } else {
          newSet.delete(status.userId);
        }
        return newSet;
      });
    }
  });

  useEffect(() => {
    const currentOnlineUsers = getOnlineUsers();
    if (currentOnlineUsers.length > 0) {
      setOnlineUsers(new Set(currentOnlineUsers));
    }
  }, []);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId) || wsIsUserOnline(userId);
  }, [onlineUsers, wsIsUserOnline]);

  return {
    isUserOnline,
    onlineUsers: useMemo(() => Array.from(onlineUsers), [onlineUsers]),
    onlineCount: onlineUsers.size
  };
};
