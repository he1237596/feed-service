import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import semver from 'semver';

export class Helpers {
  // Generate UUID
  static generateId(): string {
    return crypto.randomUUID();
  }

  // Generate hash for file integrity
  static generateHash(content: Buffer | string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Validate semver version
  static isValidVersion(version: string): boolean {
    return semver.valid(version) !== null;
  }

  // Compare versions
  static compareVersions(version1: string, version2: string): number {
    return semver.compare(version1, version2);
  }

  // Get latest version from array
  static getLatestVersion(versions: string[]): string | null {
    if (versions.length === 0) return null;
    return semver.maxSatisfying(versions, '*') || versions[0];
  }

  // Sanitize package name
  static sanitizePackageName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  // Ensure directory exists
  static ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Get file size in human readable format
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // Generate safe filename
  static generateSafeFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    return `${name}-${timestamp}-${random}${ext}`;
  }

  // Paginate array
  static paginate<T>(array: T[], page: number, limit: number): {
    items: T[];
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    const total = array.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = array.slice(offset, offset + limit);

    return {
      items,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  // Delay execution
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry function
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await this.delay(delayMs * Math.pow(2, i)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  // Clean string
  static cleanString(str: string): string {
    return str.trim().replace(/\s+/g, ' ');
  }

  // Check if string is empty or whitespace
  static isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  }

  // Get mime type from file extension
  static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.json': 'application/json',
      '.tgz': 'application/gzip',
      '.tar.gz': 'application/gzip',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Extract tar.gz file
  static async extractTarGz(filePath: string, extractPath: string): Promise<void> {
    const tar = require('tar');
    await tar.x({
      file: filePath,
      cwd: extractPath
    });
  }

  // Create tar.gz file
  static async createTarGz(sourcePath: string, outputPath: string): Promise<void> {
    const tar = require('tar');
    await tar.c({
      file: outputPath,
      cwd: sourcePath,
      gzip: true
    }, ['.']);
  }

  // Get client IP address
  static getClientIp(req: any): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection as any)?.socket?.remoteAddress ||
           '127.0.0.1';
  }

  // Get user agent
  static getUserAgent(req: any): string {
    return req.get('User-Agent') || 'Unknown';
  }

  // Validate file type
  static isValidFileType(filename: string, allowedTypes: string[]): boolean {
    const ext = path.extname(filename).toLowerCase();
    return allowedTypes.includes(ext);
  }

  // Generate random string
  static randomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Deep clone object
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // Remove undefined values from object
  static removeUndefined<T extends object>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }
    return result;
  }
}