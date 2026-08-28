export function getAuthCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export async function signInWithGoogle(): Promise<void> {
  throw new Error('Google sign-in is not yet available. Please use email sign-in.');
}
