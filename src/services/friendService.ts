import api from '../api/api';

export const acceptFriendRequest = async (friendRequestId: string) => {
  const response = await api.post(`/api/friend-requests/${friendRequestId}/accept`);
  return response.data;
};

export const rejectFriendRequest = async (friendRequestId: string) => {
  const response = await api.post(`/api/friend-requests/${friendRequestId}/reject`);
  return response.data;
};

export const getFriendRequests = async () => {
  const response = await api.get('/api/friends/requests');
  return response.data;
};

export const getFriendSuggestions = async () => {
  const response = await api.get('/api/friends/suggestions');
  return response.data;
};

export const getAcceptedFriends = async () => {
  const response = await api.get('/api/friends/accepted');
  return response.data;
}; 