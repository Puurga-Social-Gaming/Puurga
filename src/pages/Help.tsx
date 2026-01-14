import React from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, Mail, Phone, BookOpen, MessageCircle, HelpCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const Help: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">Help & Support</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FAQs & Guides Section */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen size={24} className="text-orange-500" />
              <h2 className="text-xl font-semibold">FAQs & Guides</h2>
            </div>
            <p className="text-gray-400 mb-4">Find answers to common questions and helpful guides on using Puurga.</p>
            <Link to="/help/faq">
              <button className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium">
                Browse Knowledge Base
              </button>
            </Link>
          </div>

          {/* How to Use the App Section */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={24} className="text-orange-500" />
              <h2 className="text-xl font-semibold">How to Use the App</h2>
            </div>
            <p className="text-gray-400 mb-4">Step-by-step instructions and tutorials to get started with Puurga.</p>
            <Link to="/help/instructions">
              <button className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium">
                View Tutorials
              </button>
            </Link>
          </div>

          {/* Contact Support Section */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <LifeBuoy size={24} className="text-orange-500" />
              <h2 className="text-xl font-semibold">Contact Support</h2>
            </div>
            <p className="text-gray-400 mb-4">Can't find what you're looking for? Reach out to us directly.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail size={20} className="text-orange-500" />
                <span>Email: support@puurga.com</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Phone size={20} className="text-orange-500" />
                <span>Phone: +27 12 345 6789</span>
              </div>
              <Link to="/messages">
                <button className="w-full mt-4 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium">
                  Send a Direct Message
                </button>
              </Link>
            </div>
          </div>

          {/* Community Forum Section */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle size={24} className="text-orange-500" />
              <h2 className="text-xl font-semibold">Community Forum</h2>
            </div>
            <p className="text-gray-400 mb-4">Join the discussion and get help from the Puurga community.</p>
            <Link to="/community-forum">
              <button className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium">
                Visit Forum
              </button>
            </Link>
          </div>

          {/* Report an Issue (New Section) */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 shadow-lg md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle size={24} className="text-orange-500" />
              <h2 className="text-xl font-semibold">Report an Issue</h2>
            </div>
            <p className="text-gray-400 mb-4">Encountered a bug or an issue? Let us know so we can fix it.</p>
            <Link to="/report-issue">
              <button className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                Submit a Report
              </button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Help;