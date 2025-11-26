import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  public middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.getKey(req);
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window reset
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return this.setHeadersAndContinue(res, next, 1, 1);
    }

    if (entry.count >= this.maxRequests) {
      const resetTime = Math.ceil((entry.resetTime - now) / 1000);
      
      logger.warn(`Rate limit exceeded for ${key}:`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        resetTime
      });

      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': entry.resetTime.toString(),
        'Retry-After': resetTime.toString()
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${resetTime} seconds.`,
        timestamp: new Date().toISOString(),
        path: req.path
      });
      return;
    }

    // Increment counter
    entry.count++;
    this.requests.set(key, entry);

    this.setHeadersAndContinue(res, next, entry.count, this.maxRequests);
  };

  private getKey(req: Request): string {
    // Use IP address as the key
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           'unknown';
  }

  private setHeadersAndContinue(res: Response, next: NextFunction, current: number, max: number): void {
    const remaining = Math.max(0, max - current);
    
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': remaining.toString()
    });

    next();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  public reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }

  public getStatus(key?: string): {
    [key: string]: {
      count: number;
      remaining: number;
      resetTime: number;
      timeUntilReset: number;
    };
  } | null {
    const now = Date.now();
    
    if (key) {
      const entry = this.requests.get(key);
      if (!entry) return null;
      
      return {
        [key]: {
          count: entry.count,
          remaining: Math.max(0, this.maxRequests - entry.count),
          resetTime: entry.resetTime,
          timeUntilReset: Math.max(0, entry.resetTime - now)
        }
      };
    }

    const status: {
      [key: string]: {
        count: number;
        remaining: number;
        resetTime: number;
        timeUntilReset: number;
      };
    } = {};

    for (const [k, entry] of this.requests.entries()) {
      status[k] = {
        count: entry.count,
        remaining: Math.max(0, this.maxRequests - entry.count),
        resetTime: entry.resetTime,
        timeUntilReset: Math.max(0, entry.resetTime - now)
      };
    }

    return Object.keys(status).length > 0 ? status : null;
  }
}

// Create rate limiter instance
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

export const rateLimiter = new RateLimiter(windowMs, maxRequests).middleware;

// More restrictive rate limiter for sensitive endpoints
export const strictRateLimiter = new RateLimiter(60 * 1000, 10).middleware; // 10 requests per minute

// Very restrictive for auth endpoints
export const authRateLimiter = new RateLimiter(60 * 1000, 5).middleware; // 5 requests per minute

export { RateLimiter };