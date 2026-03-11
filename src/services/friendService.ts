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
  console.log('friendService: Fetching friend requests...');
  try {
    const response = await api.get('/friends/requests');
    console.log('friendService: Friend requests response:', response.data);
    console.log('friendService: Friend requests response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('friendService: Error fetching friend requests:', error);
    throw error;
  }
};

export const getFriendSuggestions = async () => {
  console.log('friendService: Fetching friend suggestions...');
  try {
    const response = await api.get('/friends/suggestions');
    console.log('friendService: Friend suggestions response:', response.data);
    console.log('friendService: Friend suggestions response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('friendService: Error fetching friend suggestions:', error);
    throw error;
  }
};

export const getAcceptedFriends = async () => {
  console.log('friendService: Fetching accepted friends...');
  try {
    const response = await api.get('/friends/accepted');
    console.log('friendService: Accepted friends response:', response.data);
    console.log('friendService: Accepted friends response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('friendService: Error fetching accepted friends:', error);
    throw error;
  }
};

export const sendFriendRequest = async (receiverId: string) => {
  const response = await api.post('/friend-requests/send', { receiverId });
  return response.data;
};