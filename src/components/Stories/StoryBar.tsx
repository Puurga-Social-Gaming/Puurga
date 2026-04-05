import React from 'react';
import { Plus } from 'lucide-react';
import Avatar from '../Avatar';

// Define default avatar directly in the component
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMyZDJkMmQiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4NSIgcj0iMzUiIGZpbGw9IiM0MDQwNDAiLz48cGF0aCBkPSJNMTYwIDE2NWMwLTMzLjEzNy0yNi44NjMtNjAtNjAtNjBzLTYwIDI2Ljg2My02MCA2MCIgc3Ryb2tlPSIjNDA0MDQwIiBzdHJva2Utd2lkdGg9IjEyIi8+PC9zdmc+';

const MOCK_USERS = [
  {
    id: '2',
    name: 'Sarah Johnson',
    username: 'sarahj',
    avatar: DEFAULT_AVATAR,
    bio: 'Digital artist & tech enthusiast 🎨',
    followers: 1234
  },
  {
    id: '3',
    name: 'David Ndlovu',
    username: 'davidn',
    avatar: DEFAULT_AVATAR,
    bio: 'Software Developer from Cape Town 💻',
    followers: 892
  },
  {
    id: '4',
    name: 'Amara Okafor',
    username: 'amarao',
    avatar: DEFAULT_AVATAR,
    bio: 'Entrepreneur & Tech Innovator 🚀',
    followers: 2341
  }
];

const StoryBar: React.FC = () => {
  return (
    <div className="p-4">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {/* Add Story */}
        <div className="flex flex-col items-center gap-1 min-w-[72px]">
          <div className="w-14 h-14 rounded-full bg-[#2d2d2d] flex items-center justify-center cursor-pointer hover:bg-[#3d3d3d] transition-colors">
            <Plus className="text-white" size={24} />
          </div>
          <span className="text-sm text-gray-400">Add Story</span>
        </div>

        {/* User Stories */}
        {MOCK_USERS.map((user) => (
          <div key={user.id} className="flex flex-col items-center gap-1 min-w-[72px]">
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-br from-white to-gray-300 cursor-pointer">
              <Avatar
                src={user.avatar}
                alt={user.name}
                className="w-full h-full border-2 border-[#1a1a1a]"
              />
            </div>
            <span className="text-sm text-gray-400 truncate w-full text-center">
              {user.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryBar; 