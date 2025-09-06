import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  status: number;
  message: string;
  details?: any;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  
  const response: ErrorResponse = {
    status: 500,
    message: 'Internal Server Error'
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

  // Add more error types as needed

  res.status(response.status).json(response);
}; 