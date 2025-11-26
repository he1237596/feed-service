import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware, initAuth } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import { Database } from './database/Database';

// Routes
import authRoutes, { initAuthRoutes } from './routes/auth';
import packageRoutes, { initPackageRoutes } from './routes/packages';
import versionRoutes, { initVersionRoutes } from './routes/versions';
import feedRoutes, { initFeedRoutes } from './routes/feed';

// Load environment variables
dotenv.config();

class FeedService {
  private app: express.Application;
  private database: Database;

  constructor() {
    this.app = express();
    this.database = new Database();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Performance
    this.app.use(compression());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Logging
    this.app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

    // Rate limiting
    this.app.use(rateLimiter);

  // Static files
  const storagePath = process.env.STORAGE_PATH || './storage';
  const publicPath = path.join(__dirname, '../public');
  
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  this.app.use('/static', express.static(storagePath));
  this.app.use(express.static(publicPath));
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: require('../package.json').version
      });
    });

    // Note: Routes will be added after initialization in start() method
  }

  private setupRoutes(): void {
    // API Routes (setup after auth and database initialization)
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/packages', packageRoutes);
    this.app.use('/api/versions', versionRoutes);
    this.app.use('/api/feed', feedRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.database.initialize();
      logger.info('Database initialized successfully');

      // Initialize auth first
      try {
        initAuth(this.database);
      } catch (error) {
        logger.error('Failed to initialize auth middleware:', error);
      }
      
      // Initialize routes
      initAuthRoutes(this.database);
      initPackageRoutes(this.database);
      initVersionRoutes(this.database);
      initFeedRoutes(this.database);
      
      // Setup routes after all dependencies are initialized
      this.setupRoutes();
      logger.info('Routes initialized successfully');

      const port = process.env.PORT || 3000;
      this.app.listen(port, () => {
        logger.info(`🚀 Piral Feed Service started on port ${port}`);
        logger.info(`📊 Health check available at http://localhost:${port}/health`);
        logger.info(`📚 API documentation at http://localhost:${port}/api`);
      });
    } catch (error) {
      logger.error('Failed to start Feed Service:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start the service
const feedService = new FeedService();
feedService.start().catch((error) => {
  logger.error('Application failed to start:', error);
  process.exit(1);
});

export { FeedService };