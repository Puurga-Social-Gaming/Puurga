import React, { useEffect } from 'react';

/** Production-only console warning when DevTools are open. Never runs in local/dev. */
const DevDetector: React.FC = () => {
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const devtools = { open: false };
    const threshold = 160;

    const reportSecurityEvent = async (eventType: string) => {
      try {
        const userStr = localStorage.getItem('supabase.auth.token');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        if (!user?.user?.id) return;
        await fetch('/api/security/devtools-detected', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.access_token}`,
          },
          body: JSON.stringify({
            eventType,
            userId: user.user.id,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href,
          }),
        });
      } catch {
        // silent
      }
    };

    const checkDevTools = () => {
      const open =
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold;
      if (open && !devtools.open) {
        devtools.open = true;
        console.log('%c⚠️ Puurga Developer Tools Detected', 'color: red; font-size: 18px; font-weight: bold;');
        console.log('%cThis console is intended for developers.', 'color: orange; font-size: 13px;');
        void reportSecurityEvent('devtools_opened');
      } else if (!open) {
        devtools.open = false;
      }
    };

    checkDevTools();
    const interval = setInterval(checkDevTools, 2000);
    window.addEventListener('resize', checkDevTools);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkDevTools);
    };
  }, []);

  return null;
};

export default DevDetector;
