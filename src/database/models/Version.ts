import { Database } from '../Database';
import { Version } from '../../types';
import { Helpers } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export class VersionModel {
  constructor(private db: Database) {}

  public async create(versionData: {
    packageId: string;
    version: string;
    changelog?: string;
    isDeprecated?: boolean;
    filePath?: string;
    fileSize?: number;
    checksum?: string;
  }): Promise<Version> {
    const { 
      packageId, 
      version, 
      changelog, 
      isDeprecated = false,
      filePath,
      fileSize,
      checksum
    } = versionData;

    // Check if version already exists
    const existingVersion = await this.findByPackageAndVersion(packageId, version);
    if (existingVersion) {
      throw new Error(`Version ${version} already exists for this package`);
    }

    // Create new version
    const newVersion: Version = {
      id: Helpers.generateId(),
      packageId,
      version,
      changelog: changelog ? Helpers.cleanString(changelog) : undefined,
      isLatest: true, // New versions are automatically latest
      isDeprecated,
      filePath,
      fileSize,
      checksum,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.db.run('BEGIN TRANSACTION');

    try {
      // Set all existing versions to not latest
      await this.db.run(
        'UPDATE versions SET is_latest = 0, updated_at = ? WHERE package_id = ?',
        [new Date().toISOString(), packageId]
      );

      // Insert new version
      await this.db.run(
        `INSERT INTO versions 
         (id, package_id, version, changelog, is_latest, is_deprecated, file_path, file_size, checksum, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newVersion.id,
          newVersion.packageId,
          newVersion.version,
          newVersion.changelog,
          newVersion.isLatest ? 1 : 0,
          newVersion.isDeprecated ? 1 : 0,
          newVersion.filePath,
          newVersion.fileSize,
          newVersion.checksum,
          newVersion.createdAt.toISOString(),
          newVersion.updatedAt.toISOString()
        ]
      );

      await this.db.run('COMMIT');
      logger.info(`Version created: ${version} for package ${packageId}`);
      
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }

    return newVersion;
  }

  public async findById(id: string): Promise<Version | null> {
    const row = await this.db.get(
      'SELECT * FROM versions WHERE id = ?',
      [id]
    );

    return row ? this.mapRowToVersion(row) : null;
  }

  public async findByPackageAndVersion(packageId: string, version: string): Promise<Version | null> {
    const row = await this.db.get(
      'SELECT * FROM versions WHERE package_id = ? AND version = ?',
      [packageId, version]
    );

    return row ? this.mapRowToVersion(row) : null;
  }

  public async findByPackageId(packageId: string): Promise<Version[]> {
    const rows = await this.db.all(
      'SELECT * FROM versions WHERE package_id = ? ORDER BY created_at DESC',
      [packageId]
    );

    return rows.map(row => this.mapRowToVersion(row));
  }

  public async findLatest(packageId: string): Promise<Version | null> {
    const row = await this.db.get(
      'SELECT * FROM versions WHERE package_id = ? AND is_latest = 1',
      [packageId]
    );

    return row ? this.mapRowToVersion(row) : null;
  }

  public async findAll(limit: number = 20, offset: number = 0): Promise<Version[]> {
    const rows = await this.db.all(
      'SELECT * FROM versions ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return rows.map(row => this.mapRowToVersion(row));
  }

  public async update(id: string, updates: Partial<Version>): Promise<Version | null> {
    const existingVersion = await this.findById(id);
    if (!existingVersion) return null;

    const updatedVersion = {
      ...existingVersion,
      ...updates,
      updatedAt: new Date()
    };

    await this.db.run(
      `UPDATE versions 
       SET changelog = ?, is_deprecated = ?, file_path = ?, file_size = ?, checksum = ?, updated_at = ?
       WHERE id = ?`,
      [
        updatedVersion.changelog,
        updatedVersion.isDeprecated ? 1 : 0,
        updatedVersion.filePath,
        updatedVersion.fileSize,
        updatedVersion.checksum,
        updatedVersion.updatedAt.toISOString(),
        id
      ]
    );

    logger.info(`Version updated: ${existingVersion.version}`);
    return updatedVersion;
  }

  public async delete(id: string): Promise<boolean> {
    const version = await this.findById(id);
    if (!version) return false;

    // Don't allow deletion of latest version if there are other versions
    if (version.isLatest) {
      const otherVersions = await this.findByPackageId(version.packageId);
      if (otherVersions.length > 1) {
        throw new Error('Cannot delete latest version when other versions exist');
      }
    }

    const result = await this.db.run('DELETE FROM versions WHERE id = ?', [id]);
    const deleted = result.changes! > 0;
    
    if (deleted) {
      // If this was the latest version, set the newest remaining version as latest
      if (version.isLatest) {
        await this.setNewLatestVersion(version.packageId);
      }
      
      logger.info(`Version deleted: ${version.version}`);
    }
    
    return deleted;
  }

  public async setLatest(packageId: string, versionId: string): Promise<boolean> {
    await this.db.run('BEGIN TRANSACTION');

    try {
      // Set all versions to not latest
      await this.db.run(
        'UPDATE versions SET is_latest = 0, updated_at = ? WHERE package_id = ?',
        [new Date().toISOString(), packageId]
      );

      // Set specified version as latest
      const result = await this.db.run(
        'UPDATE versions SET is_latest = 1, updated_at = ? WHERE id = ? AND package_id = ?',
        [new Date().toISOString(), versionId, packageId]
      );

      await this.db.run('COMMIT');
      
      if (result.changes! > 0) {
        logger.info(`Latest version set for package ${packageId}: ${versionId}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  public async getDownloadStats(packageId: string): Promise<{ [version: string]: number }> {
    const rows = await this.db.all(
      'SELECT version, COUNT(*) as downloads FROM downloads WHERE package_id = ? GROUP BY version',
      [packageId]
    );

    const stats: { [version: string]: number } = {};
    rows.forEach(row => {
      stats[row.version] = row.downloads;
    });

    return stats;
  }

  public getLatestVersion(versions: Version[]): Version | null {
    return versions.find(v => v.isLatest) || versions[0] || null;
  }

  public async updateAllLatest(packageId: string, isLatest: boolean): Promise<void> {
    await this.db.run(
      'UPDATE versions SET is_latest = ?, updated_at = ? WHERE package_id = ?',
      [isLatest ? 1 : 0, new Date().toISOString(), packageId]
    );
  }

  public async updateLatest(versionId: string, isLatest: boolean): Promise<void> {
    await this.db.run(
      'UPDATE versions SET is_latest = ?, updated_at = ? WHERE id = ?',
      [isLatest ? 1 : 0, new Date().toISOString(), versionId]
    );
  }

  public async updateDeprecated(versionId: string, isDeprecated: boolean): Promise<void> {
    await this.db.run(
      'UPDATE versions SET is_deprecated = ?, updated_at = ? WHERE id = ?',
      [isDeprecated ? 1 : 0, new Date().toISOString(), versionId]
    );
  }

  private async setNewLatestVersion(packageId: string): Promise<void> {
    const latestVersion = await this.db.get(
      'SELECT * FROM versions WHERE package_id = ? ORDER BY created_at DESC LIMIT 1',
      [packageId]
    );

    if (latestVersion) {
      await this.db.run(
        'UPDATE versions SET is_latest = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), latestVersion.id]
      );
    }
  }

  private mapRowToVersion(row: any): Version {
    return {
      id: row.id,
      packageId: row.package_id,
      version: row.version,
      changelog: row.changelog,
      isLatest: row.is_latest === 1,
      isDeprecated: row.is_deprecated === 1,
      filePath: row.file_path,
      fileSize: row.file_size,
      checksum: row.checksum,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}