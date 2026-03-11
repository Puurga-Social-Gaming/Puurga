import { Request, Response, NextFunction } from 'express';
import { logSystemError } from '../utils/errorLogger';

interface ErrorResponse {
  status: number;
  message: string;
  details?: any;
}

export const errorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ Error: ${err.message}`);

  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  
  // Prepare user info if auth'd
  const userId = (req as any).user?.id;

  // Automated Logging
  if (status >= 500) {
    await logSystemError({
      message: err.message || 'Unknown Server Error',
      level: status === 500 ? 'ERROR' : 'CRITICAL',
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: userId,
      ipAddress: req.ip,
      metadata: {
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        headers: {
          'user-agent': req.headers['user-agent'],
          'referer': req.headers['referer']
        }
      }
    });
  }

  const response: ErrorResponse = {
    status: status,
    message: message
  };

  if (err.name === 'ValidationError') {
    response.status = 400;
    response.message = 'Validation Error';
    response.details = err.message;
  }

  if (err.name === 'UnauthorizedError') {
    response.status = 401;
    response.message = 'Unauthorized';
  }

  res.status(response.status).json(response);
};
 