import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
dotenv.config(); // Load from process.cwd()
dotenv.config({ path: path.resolve(__dirname, '.env') }); // Load from same dir as server.ts (dev)
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Load from parent dir as server.js/dist (prod)

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable must be defined");
}

export const JWT_SECRET = process.env.JWT_SECRET;
// Clear line 12
import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeStorage, getUploadPath } from './config/storage';
import jwt from 'jsonwebtoken';
import WebSocketManager from './websocketManager';
import { createServer } from 'http';
import authRoutes from './routes/auth';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import friendsRoutes from './routes/friends';
import friendRequestsRoutes from './routes/friendRequests';
import statusesRoutes from './routes/statuses';
import postsRoutes from './routes/posts';
import onlineStatusRoutes from './routes/onlineStatus';
import testNotificationRoutes from './routes/testNotifications';
import messagesRoutes from './routes/messages';
import typingRoutes from './routes/typing';
import settingsRoutes from './routes/settings';
import groupsRoutes from './routes/groups';
import commentsRoutes from './routes/comments';
import redemptionRoutes from './routes/redemption';
import testGhostModeRoutes from './routes/testGhostMode';
import creditsRoutes from './routes/credits';
import gamesRoutes from './routes/games';
import translateRoutes from './routes/translate';
import purgingRoutes from './routes/purging';
import purgesRoutes from './routes/purges';
import purgatoryRoutes from './routes/purgatory';
import survivalRoutes from './routes/survival';
import allianceRoutes from './routes/alliances';
import superadminRoutes from './routes/superadmin';
import mediaRoutes from './routes/media';
import securityRoutes from './routes/security';
import linksRoutes from './routes/links';
import searchRoutes from './routes/search';
import dashboardRoutes from './routes/dashboard';
import socialRoutes from './routes/social';
import callsRoutes from './routes/calls';
import matchmakingRoutes from './routes/matchmaking';
import cryptoRoutes from './routes/crypto';
import certificationsRoutes from './routes/certifications';
import progressionRoutes from './routes/progression';
import achievementsRoutes from './routes/achievements';
import { errorHandler } from './middleware/errorHandler';
import { PushNotificationService } from './services/pushNotificationService';
import { progressionEngine } from './services/progressionEngine';



const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx)

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co', '*'],
      connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'ws://www.puurga.com', 'wss://www.puurga.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      reportUri: '/api/security/csp-report'
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Enable gzip/brotli compression for all responses
app.use(compression());

const PORT = process.env.PORT ? Number(process.env.PORT) : 3005;

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'https://www.puurga.com',
  'https://puurga.com'
];

const envCorsOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOrigins = Array.from(new Set([...defaultCorsOrigins, ...envCorsOrigins]));

// Initialize storage before setting up multer
initializeStorage();

// CORS configuration
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware - increased limit for status uploads with images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
const storagePath = path.resolve(__dirname, '..', 'storage', 'media', 'uploads');
const fallbackStoragePath = path.resolve(__dirname, '..', '..', 'storage', 'media', 'uploads');
const backendUploadsPath = path.resolve(__dirname, 'uploads');

const getStaticUploadPath = () => {
  if (fs.existsSync(backendUploadsPath)) return backendUploadsPath;
  if (fs.existsSync(storagePath)) return storagePath;
  return fallbackStoragePath;
};

app.use('/uploads', express.static(getStaticUploadPath(), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=31557600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache for public assets
  }
}));

console.log('Serving uploads from:', getUploadPath());
console.log('Serving public files from:', path.join(__dirname, '../public'));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.method === 'POST' ? { ...req.body, password: undefined } : undefined,
    query: req.query,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? '***present***' : '***not-present***'
    }
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add rate limiting
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply limiters
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Use auth routes
app.use('/api/auth', authRoutes);

// Use notifications routes
app.use('/api/notifications', notificationRoutes);

// Use user routes
app.use('/api/users', userRoutes);

// Use friends routes
app.use('/api/friends', friendsRoutes);

// Use friend requests routes
app.use('/api/friend-requests', friendRequestsRoutes);

// Use statuses routes
app.use('/api/statuses', statusesRoutes);

// Use posts routes
app.use('/api/posts', postsRoutes);

// Use online status routes
app.use('/api/status', onlineStatusRoutes);

// Use test notification routes (for development/testing)
app.use('/api/test', testNotificationRoutes);

// Use messages routes
app.use('/api/messages', messagesRoutes);

// Use typing routes
app.use('/api/typing', typingRoutes);

// Use groups routes
app.use('/api/groups', groupsRoutes);

// Use comments routes
app.use('/api', commentsRoutes);

// Use security routes
app.use('/api/security', securityRoutes);

// Use redemption routes
app.use('/api/redeem', redemptionRoutes);

// Use test ghost mode routes (for development/testing)
app.use('/api/test/ghost-mode', testGhostModeRoutes);

// Use credits routes
app.use('/api/credits', creditsRoutes);

// Use purging routes
app.use('/api/purging', purgingRoutes);

// Use games routes
app.use('/api/games', gamesRoutes);
app.use('/api/translate', translateRoutes);

// Use purges routes (Phase 2 purge engine)
app.use('/api/purges', purgesRoutes);

// Use purgatory routes (Phase 3 purgatory system)
app.use('/api/purgatory', purgatoryRoutes);

// Use survival routes
app.use('/api/survival', survivalRoutes);

// Use alliance routes (Phase 4)
app.use('/api/alliances', allianceRoutes);

// Use settings routes
app.use('/api/settings', settingsRoutes);

// Use superadmin routes
app.use('/api/admin', superadminRoutes);

// Use media routes
app.use('/api/media', mediaRoutes);

// Use links routes
app.use('/api/links', linksRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/certifications', certificationsRoutes);
app.use('/api/progression', progressionRoutes);
app.use('/api/achievements', achievementsRoutes);

// Global Error Handler (Must be last)
app.use(errorHandler);


// Create HTTP server and initialize WebSocket manager
const server = createServer(app);
const wsManager = WebSocketManager.getInstance();
wsManager.initialize(server);

// Initialize Progression Engine (event-driven XP, achievements, missions)
progressionEngine.initialize();

// Start inactivity scheduler (runs every 24 hours)
import { InactivityService } from './services/inactivityService';
void InactivityService.startScheduler(24);

// Start alliance loyalty decay scheduler (runs every 24 hours)
import { AllianceEngine } from './services/social/alliance-engine';
setInterval(() => {
  console.log('Running daily alliance loyalty decay...');
  AllianceEngine.processDailyLoyaltyDecay().catch(err => {
    console.error('Error processing daily loyalty decay:', err);
  });
}, 24 * 60 * 60 * 1000); // Every 24 hours

// Run loyalty decay once on startup (after 5 seconds delay)
setTimeout(() => {
  console.log('Running initial alliance loyalty decay...');
  AllianceEngine.processDailyLoyaltyDecay().catch(err => {
    console.error('Error processing initial loyalty decay:', err);
  });
}, 5000);

// Export wsManager for use in other modules
export { wsManager };

// Initialize Push Notification service if VAPID keys are available
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  PushNotificationService.initialize(
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.log('ℹ️ VAPID keys not set. Push notifications disabled.');
  console.log('   Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env');
  console.log('   Generate keys: npx web-push generate-vapid-keys');
}

const startServer = async () => {
  try {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('DEBUG: Upload path is:', getUploadPath());
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Helper function to generate JWT tokens
export const generateToken = (user: { id: string }): string => {
  return jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

startServer(); // touch 15:00:33

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
