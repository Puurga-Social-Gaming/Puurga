import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

export const useOnlineStatus = () => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const { isUserOnline, getOnlineUsers } = useWebSocket({
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

  // Initialize online users when WebSocket connects
  useEffect(() => {
    const currentOnlineUsers = getOnlineUsers();
    setOnlineUsers(new Set(currentOnlineUsers));
  }, [getOnlineUsers]);

  return {
    isUserOnline: (userId: string) => onlineUsers.has(userId) || isUserOnline(userId),
    onlineUsers: Array.from(onlineUsers),
    onlineCount: onlineUsers.size
  };
};
