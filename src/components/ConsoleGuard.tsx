import React, { useEffect } from 'react';

const ConsoleGuard: React.FC = () => {
  useEffect(() => {
    const originalConsole = { ...console };
    let warned = false;

    const blockConsole = () => {
      // Allow specific safe messages through
      const allowedPatterns = [
        /testing/i,
        /suggestion/i,
        /perga security/i,
        /perga system/i,
        /controlled user testing/i,
        /safe position/i,
        /perga/i
      ];

      const isAllowedMessage = (...args: any[]) => {
        const message = (args || []).map(a => String(a)).join(' ').toLowerCase();
        return allowedPatterns.some(pattern => pattern.test(message));
      };

      // Overwrite common console methods
      console.log = function(...args: any[]) {
        if (isAllowedMessage(...args)) {
          originalConsole.log(...args);
          return;
        }
        
        if (!warned) {
          warned = true;
          originalConsole.error('%c⚠️ Perga Console Access Restricted', 'color: red; font-size: 16px; font-weight: bold;');
          originalConsole.error('%cThis is a Perga security feature to prevent malicious code execution.', 'color: orange;');
          originalConsole.error('%cIf you are a developer, set NODE_ENV=development to disable.', 'color: orange;');
          originalConsole.error('%cSee https://puurga.com/security for more information.', 'color: orange;');
        }
        // Block the actual output
        return;
      };

      console.warn = function(...args: any[]) {
        if (isAllowedMessage(...args)) {
          originalConsole.warn(...args);
          return;
        }
        return console.log(...args);
      };

      console.info = function(...args: any[]) {
        if (isAllowedMessage(...args)) {
          originalConsole.info(...args);
          return;
        }
        return console.log(...args);
      };

      console.debug = function(...args: any[]) {
        if (isAllowedMessage(...args)) {
          originalConsole.debug(...args);
          return;
        }
        return console.log(...args);
      };

      // Prevent object inspection
      console.dir = function(..._args: any[]) {
        originalConsole.error('%cPerga Console.dir is disabled for security reasons.', 'color: red;');
      };

      console.table = function(..._args: any[]) {
        originalConsole.error('%cPerga Console.table is disabled for security reasons.', 'color: red;');
      };

      console.trace = function(..._args: any[]) {
        originalConsole.error('%cPerga Console.trace is disabled for security reasons.', 'color: red;');
      };

      // Keep error and group methods for legitimate debugging
      console.error = originalConsole.error;
      console.group = originalConsole.group;
      console.groupCollapsed = originalConsole.groupCollapsed;
      console.groupEnd = originalConsole.groupEnd;
    };

    // Only block in production
    if (process.env.NODE_ENV === 'production') {
      blockConsole();
    }

    // Cleanup if component unmounts
    return () => {
      // Restore original console methods
      Object.assign(console, originalConsole);
    };
  }, []);

  return null;
};

export default ConsoleGuard;
