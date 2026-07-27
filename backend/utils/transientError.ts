/** Detect flaky Supabase / network failures that should soft-fail or retry. */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;
  const anyErr = error as {
    message?: string;
    details?: string;
    code?: string | number;
    status?: number;
    cause?: unknown;
  };
  const msg = [
    anyErr.message,
    anyErr.details,
    typeof error === 'string' ? error : '',
    anyErr.cause instanceof Error ? anyErr.cause.message : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const status = Number(anyErr.status || 0);
  return (
    /fetch failed|network|timeout|econnreset|enotfound|econnrefused|socket|aborted|temporarily unavailable|503|502|504/.test(
      msg
    ) ||
    status === 0 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}
