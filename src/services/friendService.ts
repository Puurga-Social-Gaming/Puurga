import api from '../api/api';

export const acceptFriendRequest = async (friendRequestId: string) => {
  const response = await api.post(`/friend-requests/${friendRequestId}/accept`);
  return response.data;
};

export const rejectFriendRequest = async (friendRequestId: string) => {
  const response = await api.post(`/friend-requests/${friendRequestId}/reject`);
  return response.data;
};

export const getFriendRequests = async () => {
  const response = await api.get('/friends/requests');
  return response.data;
};

export const getFriendSuggestions = async () => {
  const response = await api.get('/friends/suggestions');
  return response.data;
};

export const getAcceptedFriends = async () => {
  const response = await api.get('/friends/accepted');
  return response.data;
};