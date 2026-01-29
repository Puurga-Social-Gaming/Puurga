import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import groupsRoutes from './routes/groups';
import commentsRoutes from './routes/comments';
import redemptionRoutes from './routes/redemption';
import testGhostModeRoutes from './routes/testGhostMode';
import creditsRoutes from './routes/credits';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3005;

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177'
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
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(getUploadPath(), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=31557600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

console.log('Serving uploads from:', getUploadPath());

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
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply to auth routes
app.use('/api/auth', apiLimiter);

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

// Use redemption routes
app.use('/api/redeem', redemptionRoutes);

// Use test ghost mode routes (for development/testing)
app.use('/api/test/ghost-mode', testGhostModeRoutes);

// Use credits routes
app.use('/api/credits', creditsRoutes);

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
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

startServer(); // touch