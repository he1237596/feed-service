import { Database } from '../Database';
import { Download } from '../../types';
import { Helpers } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export class DownloadModel {
  constructor(private db: Database) {}

  public async create(downloadData: {
    versionId: string;
    packageId: string;
    version: string;
    ipAddress: string;
    userAgent?: string;
  }): Promise<Download> {
    const { versionId, packageId, version, ipAddress, userAgent } = downloadData;

    const download: Download = {
      id: Helpers.generateId(),
      versionId,
      packageId,
      version,
      ipAddress,
      userAgent,
      downloadedAt: new Date()
    };

    await this.db.run(
      `INSERT INTO downloads 
       (id, version_id, package_id, version, ip_address, user_agent, downloaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        download.id,
        download.versionId,
        download.packageId,
        download.version,
        download.ipAddress,
        download.userAgent,
        download.downloadedAt.toISOString()
      ]
    );

    logger.info(`Download recorded: ${packageId}@${version} from ${ipAddress}`);
    return download;
  }

  public async findById(id: string): Promise<Download | null> {
    const row = await this.db.get(
      'SELECT * FROM downloads WHERE id = ?',
      [id]
    );

    return row ? this.mapRowToDownload(row) : null;
  }

  public async findByPackageId(packageId: string, limit: number = 50, offset: number = 0): Promise<Download[]> {
    const rows = await this.db.all(
      'SELECT * FROM downloads WHERE package_id = ? ORDER BY downloaded_at DESC LIMIT ? OFFSET ?',
      [packageId, limit, offset]
    );

    return rows.map(row => this.mapRowToDownload(row));
  }

  public async findByVersionId(versionId: string, limit: number = 50, offset: number = 0): Promise<Download[]> {
    const rows = await this.db.all(
      'SELECT * FROM downloads WHERE version_id = ? ORDER BY downloaded_at DESC LIMIT ? OFFSET ?',
      [versionId, limit, offset]
    );

    return rows.map(row => this.mapRowToDownload(row));
  }

  public async findAll(limit: number = 50, offset: number = 0): Promise<Download[]> {
    const rows = await this.db.all(
      'SELECT * FROM downloads ORDER BY downloaded_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return rows.map(row => this.mapRowToDownload(row));
  }

  public async getPackageDownloadCount(packageId: string): Promise<number> {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM downloads WHERE package_id = ?',
      [packageId]
    );
    return result.count;
  }

  public async getVersionDownloadCount(versionId: string): Promise<number> {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM downloads WHERE version_id = ?',
      [versionId]
    );
    return result.count;
  }

  public async getPackageVersionDownloadCounts(packageId: string): Promise<{ [version: string]: number }> {
    const rows = await this.db.all(
      'SELECT version, COUNT(*) as count FROM downloads WHERE package_id = ? GROUP BY version ORDER BY count DESC',
      [packageId]
    );

    const counts: { [version: string]: number } = {};
    rows.forEach(row => {
      counts[row.version] = row.count;
    });

    return counts;
  }

  public async getOverallStats(): Promise<{
    totalDownloads: number;
    totalPackages: number;
    totalVersions: number;
    downloadsToday: number;
    downloadsThisWeek: number;
    downloadsThisMonth: number;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalDownloads, totalPackages, totalVersions, downloadsToday, downloadsThisWeek, downloadsThisMonth] = await Promise.all([
      this.db.get('SELECT COUNT(*) as count FROM downloads'),
      this.db.get('SELECT COUNT(*) as count FROM packages'),
      this.db.get('SELECT COUNT(*) as count FROM versions'),
      this.db.get('SELECT COUNT(*) as count FROM downloads WHERE downloaded_at >= ?', [today.toISOString()]),
      this.db.get('SELECT COUNT(*) as count FROM downloads WHERE downloaded_at >= ?', [weekAgo.toISOString()]),
      this.db.get('SELECT COUNT(*) as count FROM downloads WHERE downloaded_at >= ?', [monthAgo.toISOString()])
    ]);

    return {
      totalDownloads: totalDownloads.count,
      totalPackages: totalPackages.count,
      totalVersions: totalVersions.count,
      downloadsToday: downloadsToday.count,
      downloadsThisWeek: downloadsThisWeek.count,
      downloadsThisMonth: downloadsThisMonth.count
    };
  }

  public async getPopularPackages(limit: number = 10): Promise<Array<{
    packageId: string;
    packageName: string;
    downloadCount: number;
  }>> {
    const rows = await this.db.all(
      `SELECT 
        p.id as package_id,
        p.name as package_name,
        COUNT(d.id) as download_count
       FROM packages p
       INNER JOIN downloads d ON p.id = d.package_id
       WHERE p.is_public = 1
       GROUP BY p.id, p.name
       ORDER BY download_count DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(row => ({
      packageId: row.package_id,
      packageName: row.package_name,
      downloadCount: row.download_count
    }));
  }

  public async getRecentDownloads(limit: number = 20): Promise<Array<{
    packageName: string;
    version: string;
    ipAddress: string;
    downloadedAt: Date;
  }>> {
    const rows = await this.db.all(
      `SELECT 
        p.name as package_name,
        d.version,
        d.ip_address,
        d.downloaded_at
       FROM downloads d
       INNER JOIN packages p ON d.package_id = p.id
       ORDER BY d.downloaded_at DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(row => ({
      packageName: row.package_name,
      version: row.version,
      ipAddress: row.ip_address,
      downloadedAt: new Date(row.downloaded_at)
    }));
  }

  public async deleteOldDownloads(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.db.run(
      'DELETE FROM downloads WHERE downloaded_at < ?',
      [cutoffDate.toISOString()]
    );

    if (result.changes! > 0) {
      logger.info(`Deleted ${result.changes} old download records older than ${daysOld} days`);
    }

    return result.changes!;
  }

  public async getDownloadTrends(days: number = 30): Promise<Array<{
    date: string;
    downloads: number;
  }>> {
    const rows = await this.db.all(
      `SELECT 
        DATE(downloaded_at) as date,
        COUNT(*) as downloads
       FROM downloads 
       WHERE downloaded_at >= DATE('now', '-${days} days')
       GROUP BY DATE(downloaded_at)
       ORDER BY date ASC`
    );

    return rows.map(row => ({
      date: row.date,
      downloads: row.downloads
    }));
  }

  private mapRowToDownload(row: any): Download {
    return {
      id: row.id,
      versionId: row.version_id,
      packageId: row.package_id,
      version: row.version,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      downloadedAt: new Date(row.downloaded_at)
    };
  }
}