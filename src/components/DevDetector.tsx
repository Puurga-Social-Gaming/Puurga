import React, { useEffect } from 'react';

const DevDetector: React.FC = () => {
  useEffect(() => {
    let devtools = { open: false, orientation: null };
    let threshold = 160;

    const checkDevTools = () => {
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        if (!devtools.open) {
          devtools.open = true;
          console.clear();
          console.log('%c⚠️ Perga Developer Tools Detected', 'color: red; font-size: 24px; font-weight: bold;');
          console.log('%cThis area is intended for developers only.', 'color: orange; font-size: 16px;');
          console.log('%cIf you are not a developer, please close this window.', 'color: orange; font-size: 16px;');
          console.log('%cLearn more: https://puurga.com/security', 'color: #4488ff; font-size: 14px;');
          
          // Report to server if user is logged in
          reportSecurityEvent('devtools_opened');
        }
      } else {
        devtools.open = false;
      }
    };

    // Function to report security events to server
    const reportSecurityEvent = async (eventType: string) => {
      try {
        // Get current user from localStorage or context
        const userStr = localStorage.getItem('supabase.auth.token');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user?.user?.id) {
            await fetch('/api/security/devtools-detected', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.access_token}`
              },
              body: JSON.stringify({
                eventType,
                userId: user.user.id,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                url: window.location.href
              })
            });
          }
        }
      } catch (error) {
        // Silent fail - don't alert the user
        console.error('Failed to report security event:', error);
      }
    };

    // Check immediately and on interval
    checkDevTools();
    const interval = setInterval(checkDevTools, 500);

    // Also detect keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.metaKey && e.altKey && e.key === 'I')
      ) {
        e.preventDefault();
        e.stopPropagation();
        console.clear();
        console.log('%c⚠️ Perga Developer Tools Shortcut Blocked', 'color: red; font-size: 20px; font-weight: bold;');
        console.log('%cPlease use the browser menu instead.', 'color: orange;');
        
        // Report to server if user is logged in
        reportSecurityEvent('devtools_shortcut_blocked');
        return false;
      }
    };

    // Only in production
    if (process.env.NODE_ENV === 'production') {
      document.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('resize', checkDevTools);
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', checkDevTools);
    };
  }, []);

  return null;
};

export default DevDetector;
