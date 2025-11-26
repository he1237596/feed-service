import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' || error.name === 'SQLiteError') {
    statusCode = 500;
    message = 'Database error';
    if (error.message.includes('UNIQUE constraint failed')) {
      statusCode = 409;
      message = 'Resource already exists';
    }
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    message = error.message;
  } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
    statusCode = 403;
    message = error.message;
  }

  // Log error details
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Log full error in development
  if (process.env.NODE_ENV === 'development') {
    logger.error('Error Details:', {
      message: error.message,
      stack: error.stack,
      statusCode,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    });
  } else {
    // In production, only log operational errors
    if (error instanceof AppError && error.isOperational) {
      logger.warn('Operational Error:', {
        message: error.message,
        statusCode,
        path: req.path,
        method: req.method
      });
    } else {
      logger.error('Unexpected Error:', {
        message: error.message,
        statusCode,
        path: req.path,
        method: req.method
      });
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
    path: req.path
  };

  res.status(404).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};