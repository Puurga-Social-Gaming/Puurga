import React from 'react';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retryableLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries = 2
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await delay(1000 * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  });
}
