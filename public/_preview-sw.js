/* DEV-ONLY preview stub: intercepts /api/* so the mobile layout harness can
   render without a real backend session. Delete together with
   _mobile-preview.html when done. */
const PROFILE = {
  id: 'preview-user',
  full_name: 'Preview User',
  username: 'preview_user',
  email: 'preview@example.com',
  avatar_url: null,
  cover_photo: null,
  bio: '',
  pura_points: 0,
  credits: 1250,
  purga_points: 1250,
  role: 'user',
  is_ghost: false,
  purge_count: 1,
  isOnline: true,
  created_at: new Date().toISOString(),
};

const CREDITS = { balance: 1250, credits: 1250, purga_points: 1250 };

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/api/')) return;

  // Object-shaped endpoints need JSON objects; list endpoints need arrays
  // (the preview only needs the shell to render without crashing).
  const wantsObject =
    event.request.method !== 'GET' ||
    url.pathname === '/api/users/profile' ||
    url.pathname === '/api/credits' ||
    /\/(stats|state|status|me|profile)$/.test(url.pathname);

  let body;
  if (url.pathname === '/api/users/profile') body = PROFILE;
  else if (url.pathname === '/api/credits') body = CREDITS;
  else if (wantsObject) body = { success: true, ...CREDITS };
  else body = [];

  event.respondWith(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
});
