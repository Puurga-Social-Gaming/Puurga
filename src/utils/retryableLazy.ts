import React from 'react';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as Error)?.message || error || '');
  return /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically imported module/i.test(
    msg,
  );
}

/**
 * React.lazy wrapper that retries transient Vite HMR / network failures.
 * On persistent chunk load errors, forces a one-time full page reload
 * (avoids the blank "Unexpected Application Error" after server restarts).
 */
export function retryableLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries = 2,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await delay(400 * Math.pow(2, attempt));
        }
      }
    }

    if (isChunkLoadError(lastError) && typeof window !== 'undefined') {
      const key = 'puurga_chunk_reload';
      const last = Number(sessionStorage.getItem(key) || 0);
      const now = Date.now();
      // Only auto-reload once per 15s to avoid infinite loops
      if (now - last > 15_000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
        // Keep suspense hanging while reload starts
        return new Promise(() => undefined) as Promise<{ default: T }>;
      }
    }

    throw lastError;
  });
}
