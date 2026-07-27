export const DEFAULT_IMAGES = {
  avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMyZDJkMmQiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4NSIgcj0iMzUiIGZpbGw9IiM0MDQwNDAiLz48cGF0aCBkPSJNMTYwIDE2NWMwLTMzLjEzNy0yNi44NjMtNjAtNjAtNjBzLTYwIDI2Ljg2My02MCA2MCIgc3Ryb2tlPSIjNDA0MDQwIiBzdHJva2Utd2lkdGg9IjEyIi8+PC9zdmc+',
  cover: '/images/default-cover.svg',
};

export const MOCK_USERS = [
  {
    id: '2',
    name: 'Sarah Johnson',
    username: 'sarahj',
    avatar: DEFAULT_IMAGES.avatar,
    coverImage: DEFAULT_IMAGES.cover,
    bio: 'Digital artist & tech enthusiast 🎨',
    followers: 1234
  },
  {
    id: '3',
    name: 'David Ndlovu',
    username: 'davidn',
    avatar: DEFAULT_IMAGES.avatar,
    coverImage: DEFAULT_IMAGES.cover,
    bio: 'Software Developer from Cape Town 💻',
    followers: 892
  },
  {
    id: '4',
    name: 'Amara Okafor',
    username: 'amarao',
    avatar: DEFAULT_IMAGES.avatar,
    coverImage: DEFAULT_IMAGES.cover,
    bio: 'Entrepreneur & Tech Innovator 🚀',
    followers: 2341
  }
] as const; 