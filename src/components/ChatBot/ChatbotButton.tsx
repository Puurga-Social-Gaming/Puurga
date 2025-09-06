import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

const ChatbotButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-[#1a1a1a] rounded-xl shadow-lg border border-[#333] overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between bg-[#222] px-4 py-3 border-b border-[#333]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-white font-medium">Puurga Assistant</span>
            </div>
            <button 
              onClick={toggleChat}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4 h-[calc(100%-4rem)] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                  <MessageSquare size={16} className="text-white" />
                </div>
                <div className="bg-[#222] rounded-lg p-3 text-white text-sm max-w-[80%]">
                  Hello! How can I help you today?
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 bg-[#222] rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
      
      <button
        onClick={toggleChat}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 shadow-lg transition-transform hover:scale-110"
      >
        <MessageSquare size={24} />
      </button>
    </div>
  );
};

export default ChatbotButton; 