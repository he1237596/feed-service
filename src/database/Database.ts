import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { Helpers } from '../utils/helpers';

export class Database {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.DB_PATH || './data/feed-service.db';
    
    // Ensure data directory exists
    const dbDir = path.dirname(this.dbPath);
    Helpers.ensureDirectory(dbDir);
  }

  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error('Failed to connect to database:', err);
          reject(err);
        } else {
          logger.info(`Connected to SQLite database at ${this.dbPath}`);
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Packages table
      `CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        author TEXT NOT NULL,
        author_id TEXT NOT NULL,
        is_public BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Versions table
      `CREATE TABLE IF NOT EXISTS versions (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        version TEXT NOT NULL,
        changelog TEXT,
        is_latest BOOLEAN DEFAULT 0,
        is_deprecated BOOLEAN DEFAULT 0,
        file_path TEXT,
        file_size INTEGER,
        checksum TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE,
        UNIQUE(package_id, version)
      )`,

      // Downloads table
      `CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        version_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        version TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (version_id) REFERENCES versions (id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE
      )`,

      // API keys table
      `CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        permissions TEXT NOT NULL,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`
    ];

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name)',
      'CREATE INDEX IF NOT EXISTS idx_packages_author ON packages(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_versions_package_id ON versions(package_id)',
      'CREATE INDEX IF NOT EXISTS idx_versions_version ON versions(version)',
      'CREATE INDEX IF NOT EXISTS idx_downloads_package_id ON downloads(package_id)',
      'CREATE INDEX IF NOT EXISTS idx_downloads_version_id ON downloads(version_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)'
    ];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create tables
        tables.forEach((sql) => {
          this.db.run(sql, (err) => {
            if (err) {
              logger.error('Error creating table:', err);
              reject(err);
              return;
            }
          });
        });

        // Create indexes
        indexes.forEach((sql) => {
          this.db.run(sql, (err) => {
            if (err) {
              logger.error('Error creating index:', err);
            }
          });
        });

        logger.info('Database tables created successfully');
        resolve();
      });
    });
  }

  public getDb(): sqlite3.Database {
    return this.db;
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
          reject(err);
        } else {
          logger.info('Database connection closed');
          resolve();
        }
      });
    });
  }

  public async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database run error:', err);
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  public async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  public async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  public async beginTransaction(): Promise<void> {
    await this.run('BEGIN TRANSACTION');
  }

  public async commit(): Promise<void> {
    await this.run('COMMIT');
  }

  public async rollback(): Promise<void> {
    await this.run('ROLLBACK');
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('SELECT 1 as health');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}