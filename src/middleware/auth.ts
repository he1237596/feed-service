import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../database/models/User';
import { Database } from '../database/Database';
import { AuthToken } from '../types';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AuthMiddleware {
  private userModel: UserModel;
  private jwtSecret: string;

  constructor(private db: Database) {
    this.userModel = new UserModel(db);
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  }

  public authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Access token required',
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtSecret) as AuthToken;
      
      // Verify user exists and is active
      const user = await this.userModel.findById(decoded.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid token - user not found',
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      } else {
        logger.error('Authentication error:', error);
        res.status(500).json({
          success: false,
          error: 'Authentication failed',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }
    }
  };

  public authorize = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      next();
    };
  };

  public optional = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        next();
        return;
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, this.jwtSecret) as AuthToken;
      
      const user = await this.userModel.findById(decoded.userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role
        };
      }

      next();
    } catch (error) {
      // Token is invalid, but we continue without authentication
      next();
    }
  };

  public generateToken = (user: { id: string; email: string; role: string }): string => {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      this.jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );
  };

  public refreshToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const user = await this.userModel.findById(req.user.id);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const newToken = this.generateToken(user);

      res.json({
        success: true,
        data: {
          token: newToken,
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };
}

// Create instance with database
let authMiddleware: AuthMiddleware;

export const initAuth = (db: Database): void => {
  authMiddleware = new AuthMiddleware(db);
};

// Export middleware functions
export const auth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!authMiddleware) {
    throw new Error('Auth middleware not initialized. Call initAuth() first.');
  }
  authMiddleware.authenticate(req, res, next);
};

export const authorize = (allowedRoles: string[]) => {
  if (!authMiddleware) {
    throw new Error('Auth middleware not initialized. Call initAuth() first.');
  }
  return authMiddleware.authorize(allowedRoles);
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!authMiddleware) {
    throw new Error('Auth middleware not initialized. Call initAuth() first.');
  }
  authMiddleware.optional(req, res, next);
};

export const generateToken = (user: { id: string; email: string; role: string }): string => {
  if (!authMiddleware) {
    throw new Error('Auth middleware not initialized. Call initAuth() first.');
  }
  return authMiddleware.generateToken(user);
};

export const refreshToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!authMiddleware) {
    throw new Error('Auth middleware not initialized. Call initAuth() first.');
  }
  return authMiddleware.refreshToken(req, res);
};

export { authMiddleware };