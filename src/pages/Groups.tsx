import React from 'react';
import { Users, Shield, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface Group {
  id: string;
  name: string;
  members: number;
  description: string;
  imageUrl: string;
  shieldPoints: number;
  isPrivate: boolean;
}

const MOCK_GROUPS: Group[] = [
  {
    id: '1',
    name: 'Soweto Tech Hub',
    members: 1234,
    description: 'Tech enthusiasts from Soweto sharing knowledge and opportunities',
    imageUrl: '/images/groups/soweto-tech.png',
    shieldPoints: 2500,
    isPrivate: false
  },
  {
    id: '2',
    name: 'Cape Town Innovators',
    members: 892,
    description: 'Innovation and startup community in the Mother City',
    imageUrl: '/images/groups/cape-town.png',
    shieldPoints: 1800,
    isPrivate: true
  },
  {
    id: '3',
    name: 'Durban Creators',
    members: 567,
    description: 'Creative minds collaborating in KZN',
    imageUrl: '/images/groups/durban.png',
    shieldPoints: 1200,
    isPrivate: false
  }
];

const Groups: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Create Group
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_GROUPS.map((group) => (
            <div key={group.id} className="bg-[#1a1a1a] rounded-xl overflow-hidden">
              {/* Group Header Image */}
              <div className="h-32 bg-[#2d2d2d] relative">
                <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                  <div className="w-16 h-16 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                    <Users size={32} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{group.name}</h3>
                    <p className="text-sm text-gray-400">{group.members} members</p>
                  </div>
                </div>
              </div>

              {/* Group Info */}
              <div className="p-4">
                <p className="text-gray-400 text-sm mb-4">{group.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="text-orange-500" size={16} />
                    <span className="text-sm text-white">{group.shieldPoints} Shield Points</span>
                  </div>
                  {group.isPrivate && (
                    <span className="text-xs bg-[#2d2d2d] text-gray-400 px-2 py-1 rounded-full">
                      Private
                    </span>
                  )}
                </div>

                {/* Join Button */}
                <button className="w-full mt-4 py-2 bg-[#2d2d2d] text-white rounded-lg hover:bg-orange-500 transition-colors">
                  Join Group
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Trending Groups */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="text-orange-500" size={20} />
            <h2 className="text-lg font-bold text-white">Trending Groups</h2>
          </div>
          <div className="space-y-4">
            {MOCK_GROUPS.slice(0, 3).map((group) => (
              <div key={group.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-[#2d2d2d] flex items-center justify-center">
                    <Users size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{group.name}</p>
                    <p className="text-sm text-gray-400">{group.members} members</p>
                  </div>
                </div>
                <button className="px-4 py-1 bg-[#2d2d2d] text-white rounded-full hover:bg-orange-500 transition-colors text-sm">
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Groups;