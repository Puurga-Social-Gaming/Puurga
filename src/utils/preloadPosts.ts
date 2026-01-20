import api from '../api/api';

// Cache for preloaded posts
let postsCache: any[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 30000; // 30 seconds

export const preloadPosts = async (): Promise<void> => {
  try {
    console.log('🚀 Preloading posts during welcome screen...');
    const tryEndpoints = ['/posts/feed', '/users/posts/feed'];
    
    for (const ep of tryEndpoints) {
      try {
        const response = await api.get(ep);
        const data = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
        
        if (Array.isArray(data)) {
          postsCache = data;
          cacheTimestamp = Date.now();
          console.log(`✅ Posts preloaded successfully! Count: ${data.length}`);
          return;
        }
      } catch (e) {
        console.warn(`Preload failed at ${ep}`, e);
      }
    }
  } catch (error) {
    console.error('Failed to preload posts:', error);
  }
};

export const getCachedPosts = (): any[] | null => {
  // Check if cache is still valid
  if (postsCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_DURATION) {
      console.log('📦 Using cached posts from preload');
      return postsCache;
    } else {
      console.log('⏰ Cache expired, will fetch fresh posts');
    }
  }
  return null;
};

export const clearPostsCache = (): void => {
  postsCache = null;
  cacheTimestamp = null;
};
