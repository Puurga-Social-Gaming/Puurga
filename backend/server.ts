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
import purgingRoutes from './routes/purging';
import superadminRoutes from './routes/superadmin';
import securityRoutes from './routes/security';
import { errorHandler } from './middleware/errorHandler';



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

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const storagePath = path.resolve(__dirname, '..', 'storage', 'media', 'uploads');
const fallbackStoragePath = path.resolve(__dirname, '..', '..', 'storage', 'media', 'uploads');

app.use('/uploads', express.static(fs.existsSync(storagePath) ? storagePath : fallbackStoragePath, {
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

// Use settings routes
app.use('/api/settings', settingsRoutes);

// Use superadmin routes
app.use('/api/admin', superadminRoutes);

// Global Error Handler (Must be last)
app.use(errorHandler);


// Create HTTP server and initialize WebSocket manager
const server = createServer(app);
const wsManager = WebSocketManager.getInstance();
wsManager.initialize(server);

// Export wsManager for use in other modules
export { wsManager };

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
