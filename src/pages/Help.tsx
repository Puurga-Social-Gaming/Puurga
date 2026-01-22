import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Mail, Phone, BookOpen, HelpCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        className="w-full flex justify-between items-center py-4 text-left font-semibold text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <HelpCircle size={20} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-muted">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Help: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background p-6 text-foreground"
    >
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center">
          <LifeBuoy className="mx-auto text-accent h-16 w-16 mb-4" />
          <h1 className="text-4xl font-bold mb-2">Help & Support</h1>
          <p className="text-lg text-muted">Your guide to mastering Puurga. Find answers, tutorials, and contact information below.</p>
        </header>

        {/* Main Sections */}
        <div className="space-y-10">
          {/* FAQs Section */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><BookOpen className="text-accent" />Frequently Asked Questions</h2>
            <div className="bg-card rounded-xl p-6 shadow-theme-sm">
              <AccordionItem title="What is a 'Purge'?">
                <p>A 'Purge' is a core mechanic in Puurga where users can vote to remove another user's post. If a post receives enough purges, it gets 'ghosted' and becomes temporarily invisible.</p>
              </AccordionItem>
              <AccordionItem title="How do I earn Credits?">
                <p>You can earn credits by completing daily challenges, participating in community events, and maintaining a high purge streak. Credits are used to redeem ghosted users and gain other advantages.</p>
              </AccordionItem>
              <AccordionItem title="What is 'Ghost Status'?">
                <p>If you receive too many purges on your posts, you enter 'Ghost Status.' This temporarily limits your interaction on the platform. You can play the Redemption mini-game to restore your standing faster.</p>
              </AccordionItem>
            </div>
          </section>

          {/* How to Use Section */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><FileText className="text-accent" />How to Use Puurga</h2>
            <div className="bg-card rounded-xl p-6 shadow-theme-sm space-y-4">
              <div>
                <h3 className="font-semibold text-lg">1. Create and Share Posts</h3>
                <p className="text-muted">Share your thoughts, images, and updates with the community. High-quality content is less likely to be purged.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">2. Engage with the Community</h3>
                <p className="text-muted">Join groups, comment on posts, and build your reputation. Positive engagement can earn you mercy from purges.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">3. Play Mini-Games</h3>
                <p className="text-muted">Visit the Games tab to play 'Sword of Judgment' and 'Redemption.' Earn points, credits, and restore your status.</p>
              </div>
            </div>
          </section>

          {/* Contact & Report Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card rounded-xl p-6 shadow-theme-sm">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Mail className="text-accent" />Contact Us</h2>
              <p className="text-muted mb-4">Have a question or need direct assistance? Reach out to our support team.</p>
              <div className="space-y-3">
                <p className="flex items-center gap-2"><Mail size={16} /> <span>support@puurga.com</span></p>
                <p className="flex items-center gap-2"><Phone size={16} /> <span>+27 12 345 6789</span></p>
                <Link to="/messages" className="block w-full mt-4">
                  <button className="w-full py-2 px-4 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium">
                    Send a Direct Message
                  </button>
                </Link>
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-theme-sm">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><HelpCircle className="text-accent" />Report an Issue</h2>
              <p className="text-muted mb-4">Found a bug or encountered a problem? Let us know so we can fix it.</p>
              <Link to="/report-issue" className="block w-full mt-4">
                <button className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                  Submit a Report
                </button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

export default Help;