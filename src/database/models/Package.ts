import { Database } from '../Database';
import { Package, PackageWithVersions } from '../../types';
import { Helpers } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { VersionModel } from './Version';

export class PackageModel {
  private versionModel: VersionModel;

  constructor(private db: Database) {
    this.versionModel = new VersionModel(db);
  }

  public async create(packageData: {
    name: string;
    description?: string;
    author: string;
    authorId: string;
    isPublic?: boolean;
  }): Promise<Package> {
    const { name, description, author, authorId, isPublic = true } = packageData;
    
    const pkg: Package = {
      id: Helpers.generateId(),
      name: Helpers.sanitizePackageName(name),
      description: description ? Helpers.cleanString(description) : undefined,
      author,
      authorId,
      isPublic,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.db.run(
      `INSERT INTO packages (id, name, description, author, author_id, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pkg.id,
        pkg.name,
        pkg.description,
        pkg.author,
        pkg.authorId,
        pkg.isPublic ? 1 : 0,
        pkg.createdAt.toISOString(),
        pkg.updatedAt.toISOString()
      ]
    );

    logger.info(`Package created: ${pkg.name} by ${author}`);
    return pkg;
  }

  public async findById(id: string): Promise<Package | null> {
    const row = await this.db.get(
      'SELECT * FROM packages WHERE id = ?',
      [id]
    );

    return row ? this.mapRowToPackage(row) : null;
  }

  public async findByName(name: string): Promise<Package | null> {
    const row = await this.db.get(
      'SELECT * FROM packages WHERE name = ?',
      [name]
    );

    return row ? this.mapRowToPackage(row) : null;
  }

  public async findAll(
    limit: number = 20, 
    offset: number = 0,
    filters?: {
      author?: string;
      isPublic?: boolean;
    }
  ): Promise<Package[]> {
    let sql = 'SELECT * FROM packages WHERE 1=1';
    const params: any[] = [];

    if (filters?.author) {
      sql += ' AND author = ?';
      params.push(filters.author);
    }

    if (filters?.isPublic !== undefined) {
      sql += ' AND is_public = ?';
      params.push(filters.isPublic ? 1 : 0);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await this.db.all(sql, params);
    return rows.map(row => this.mapRowToPackage(row));
  }

  public async findWithVersions(name: string): Promise<PackageWithVersions | null> {
    try {
      const pkg = await this.findByName(name);
      if (!pkg) return null;

      logger.info(`Found package: ${pkg.name} with id: ${pkg.id}`);

      const versions = await this.versionModel.findByPackageId(pkg.id);
      logger.info(`Found ${versions.length} versions for package: ${pkg.name}`);

      let downloadCount = 0;
      try {
        downloadCount = await this.getDownloadCount(pkg.id);
      } catch (error) {
        logger.warn('Failed to get download count:', error);
        downloadCount = 0;
      }

      const result = {
        ...pkg,
        versions,
        downloads: downloadCount,
        latestVersion: this.versionModel.getLatestVersion(versions)?.version
      };
      
      logger.info(`Package with versions result for ${pkg.name}:`, {
        versionCount: versions.length,
        downloadCount,
        latestVersion: result.latestVersion
      });

      return result;
    } catch (error) {
      logger.error('Error in findWithVersions:', {
        packageName: name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  public async update(id: string, updates: Partial<Package>): Promise<Package | null> {
    const existingPackage = await this.findById(id);
    if (!existingPackage) return null;

    const updatedPackage = {
      ...existingPackage,
      ...updates,
      updatedAt: new Date()
    };

    await this.db.run(
      `UPDATE packages 
       SET description = ?, is_public = ?, updated_at = ?
       WHERE id = ?`,
      [
        updatedPackage.description,
        updatedPackage.isPublic ? 1 : 0,
        updatedPackage.updatedAt.toISOString(),
        id
      ]
    );

    logger.info(`Package updated: ${existingPackage.name}`);
    return updatedPackage;
  }

  public async delete(id: string): Promise<boolean> {
    const pkg = await this.findById(id);
    if (!pkg) return false;

    const result = await this.db.run('DELETE FROM packages WHERE id = ?', [id]);
    const deleted = result.changes! > 0;
    
    if (deleted) {
      logger.info(`Package deleted: ${pkg.name}`);
    }
    
    return deleted;
  }

  public async search(
    query: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<Package[]> {
    const rows = await this.db.all(
      `SELECT * FROM packages 
       WHERE (name LIKE ? OR description LIKE ?) AND is_public = 1
       ORDER BY updated_at DESC 
       LIMIT ? OFFSET ?`,
      [`%${query}%`, `%${query}%`, limit, offset]
    );

    return rows.map(row => this.mapRowToPackage(row));
  }

  public async getByAuthor(authorId: string, limit: number = 20, offset: number = 0): Promise<Package[]> {
    const rows = await this.db.all(
      'SELECT * FROM packages WHERE author_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      [authorId, limit, offset]
    );

    return rows.map(row => this.mapRowToPackage(row));
  }

  public async getPopular(limit: number = 10): Promise<Package[]> {
    const rows = await this.db.all(
      `SELECT p.*, COUNT(d.id) as download_count 
       FROM packages p
       LEFT JOIN downloads d ON p.id = d.package_id
       WHERE p.is_public = 1
       GROUP BY p.id
       ORDER BY download_count DESC, p.updated_at DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(row => this.mapRowToPackage(row));
  }

  public async getRecent(limit: number = 10): Promise<Package[]> {
    const rows = await this.db.all(
      'SELECT * FROM packages WHERE is_public = 1 ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    return rows.map(row => this.mapRowToPackage(row));
  }

  public async getCount(filters?: {
    author?: string;
    isPublic?: boolean;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM packages WHERE 1=1';
    const params: any[] = [];

    if (filters?.author) {
      sql += ' AND author = ?';
      params.push(filters.author);
    }

    if (filters?.isPublic !== undefined) {
      sql += ' AND is_public = ?';
      params.push(filters.isPublic ? 1 : 0);
    }

    const result = await this.db.get(sql, params);
    return result.count;
  }

  private async getDownloadCount(packageId: string): Promise<number> {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM downloads WHERE package_id = ?',
      [packageId]
    );
    return result.count;
  }

  private mapRowToPackage(row: any): Package {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      author: row.author,
      authorId: row.author_id,
      isPublic: row.is_public === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}