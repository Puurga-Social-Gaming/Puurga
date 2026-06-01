import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import PurgingRitual from './PurgingRitual';
import { getLoadingMessages, LoadingContext } from './loadingMessages';

interface DelayedLoaderProps {
  isLoading: boolean;
  context?: LoadingContext;
  customMessage?: string;
  children: React.ReactNode;
}

const DelayedLoader: React.FC<DelayedLoaderProps> = ({ 
  isLoading, 
  context = 'global',
  customMessage,
  children 
}) => {
  const [showLoader, setShowLoader] = useState(false);
  const [minimumTimeReached, setMinimumTimeReached] = useState(false);
  const loadingStartTime = useRef<number | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const minimumTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading && !showLoader) {
      // Start loading timer
      loadingStartTime.current = Date.now();
      
      // Show loader after 400ms delay
      showTimeoutRef.current = setTimeout(() => {
        setShowLoader(true);
        
        // Set minimum display time of 1.5 seconds
        minimumTimeoutRef.current = setTimeout(() => {
          setMinimumTimeReached(true);
        }, 1500);
      }, 400);
    } else if (!isLoading && showLoader) {
      // Clear any pending timeouts
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      
      // If minimum time hasn't been reached, wait for it
      if (!minimumTimeReached) {
        // The minimum timeout will handle hiding the loader
        return;
      } else {
        // Hide loader immediately if minimum time has passed
        setShowLoader(false);
        setMinimumTimeReached(false);
      }
    }
  }, [isLoading, showLoader, minimumTimeReached]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (minimumTimeoutRef.current) {
        clearTimeout(minimumTimeoutRef.current);
      }
    };
  }, []);

  // Handle minimum timeout completion
  useEffect(() => {
    if (minimumTimeReached && !isLoading) {
      setShowLoader(false);
      setMinimumTimeReached(false);
    }
  }, [minimumTimeReached, isLoading]);

  const messages = customMessage ? [customMessage] : getLoadingMessages(context);

  return (
    <>
      <AnimatePresence mode="wait">
        {showLoader && (
          <PurgingRitual 
            key="purging-ritual"
            messages={messages}
          />
        )}
      </AnimatePresence>
      {children}
    </>
  );
};

export default DelayedLoader;
