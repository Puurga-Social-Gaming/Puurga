import express from 'express';
import axios from 'axios';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

/**
 * POST /api/links/preview
 * Fetch OpenGraph metadata for a URL (title, description, image, siteName)
 * Acts as a proxy to avoid CORS issues
 */
router.post('/preview', auth, async (req: AuthRequest, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const metadata: {
      title: string;
      description: string;
      image: string | null;
      siteName: string;
    } = {
      title: urlObj.hostname,
      description: url,
      image: null,
      siteName: urlObj.hostname.replace('www.', ''),
    };

    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PuurgaBot/1.0; +https://puurga.app)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        maxRedirects: 5,
        responseType: 'text',
      });

      const html = response.data as string;

      // Extract OpenGraph and standard meta tags
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*\/?>/i);
      const ogDescription = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*\/?>/i);
      const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*\/?>/i);
      const ogSiteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["'][^>]*\/?>/i);

      // Fallback to standard meta tags if OG tags not found
      const metaTitle = html.match(/<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']title["'][^>]*\/?>/i);
      const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*\/?>/i);

      // HTML title tag as last resort
      const htmlTitle = html.match(/<title>([^<]*)<\/title>/i);

      // Twitter card image as fallback
      const twitterImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*\/?>/i);

      if (ogTitle) metadata.title = ogTitle[1];
      else if (metaTitle) metadata.title = metaTitle[1];
      else if (htmlTitle) metadata.title = htmlTitle[1].trim();

      if (ogDescription) metadata.description = ogDescription[1];
      else if (metaDescription) metadata.description = metaDescription[1];

      if (ogImage) metadata.image = ogImage[1];
      else if (twitterImage) metadata.image = twitterImage[1];

      if (ogSiteName) metadata.siteName = ogSiteName[1];
    } catch (fetchError) {
      console.log('Could not fetch URL metadata, using fallback:', (fetchError as Error).message);
    }

    // Ensure image URL is absolute
    if (metadata.image && !metadata.image.startsWith('http')) {
      try {
        metadata.image = new URL(metadata.image, urlObj.origin).href;
      } catch {
        metadata.image = null;
      }
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error fetching link preview:', error);
    res.status(500).json({ error: 'Failed to fetch link preview' });
  }
});

export default router;