import { Router, Response } from 'express';
import { Database } from '../database/Database';
import { PackageModel } from '../database/models/Package';
import { VersionModel } from '../database/models/Version';
import { DownloadModel } from '../database/models/Download';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { Helpers } from '../utils/helpers';
import { ApiResponse, FeedInfo, FeedVersion } from '../types';
import { validateParams, packageNameSchema, packageParamSchema, packageVersionSchema, packageNameParamSchema } from '../utils/validation';

const router = Router();
let packageModel: PackageModel;
let versionModel: VersionModel;
let downloadModel: DownloadModel;

// Initialize dependencies
export const initFeedRoutes = (db: Database): void => {
  packageModel = new PackageModel(db);
  versionModel = new VersionModel(db);
  downloadModel = new DownloadModel(db);
};

// Piral CLI compatible feed endpoint
router.get('/pilets', optionalAuth, asyncHandler(async (req: any, res: Response) => {
  const packages = await packageModel.findAll(100, 0, { 
    isPublic: true 
  });

  const feedItems = await Promise.all(packages.map(async (pkg) => {
    const versions = await versionModel.findByPackageId(pkg.id);
    const latestVersion = versionModel.getLatestVersion(versions);
    
    return {
      name: pkg.name,
      version: latestVersion?.version || '0.0.0',
      description: pkg.description,
      author: pkg.author,
      link: `${req.protocol}://${req.get('host')}/api/feed/${pkg.name}`,
      created: pkg.createdAt.toISOString(),
      updated: pkg.updatedAt.toISOString()
    };
  }));

  res.json({
    items: feedItems
  });
}));

// Get overall feed information
router.get('/', optionalAuth, asyncHandler(async (req: any, res: Response) => {
  const stats = await downloadModel.getOverallStats();
  const popularPackages = await packageModel.getPopular(5);
  const recentPackages = await packageModel.getRecent(5);
  const recentDownloads = await downloadModel.getRecentDownloads(10);

  const response: ApiResponse = {
    success: true,
    data: {
      stats,
      popularPackages,
      recentPackages,
      recentDownloads,
      timestamp: new Date().toISOString()
    }
  };

  res.json(response);
}));

// Get feed for specific package (Piral compatible format)
router.get('/:name', optionalAuth, validateParams(packageNameParamSchema), asyncHandler(async (req: any, res: Response) => {
  const { name } = req.params;

  const pkg = await packageModel.findByName(name);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (!pkg.isPublic && (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id))) {
    throw new AppError('Package not found', 404);
  }

  const versions = await versionModel.findByPackageId(pkg.id);
  const downloadStats = await versionModel.getDownloadStats(pkg.id);

  // Transform to feed format
  const feedVersions: FeedVersion[] = versions.map(version => ({
    version: version.version,
    changelog: version.changelog,
    isDeprecated: version.isDeprecated,
    isLatest: version.isLatest,
    createdAt: version.createdAt.toISOString(),
    downloadUrl: `${req.protocol}://${req.get('host')}/api/versions/${name}/${version.version}/download`,
    size: version.fileSize,
    checksum: version.checksum
  }));

  // Sort versions by semantic version (newest first)
  feedVersions.sort((a, b) => Helpers.compareVersions(b.version, a.version));

  const feedInfo: FeedInfo = {
    name: pkg.name,
    description: pkg.description,
    versions: feedVersions,
    latest: versionModel.getLatestVersion(versions)?.version || '0.0.0',
    author: pkg.author,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString()
  };

  const response: ApiResponse = {
    success: true,
    data: feedInfo
  };

  res.json(response);
}));

// Get package feed in NPM compatible format
router.get('/:name/npm', optionalAuth, validateParams(packageNameParamSchema), asyncHandler(async (req: any, res: Response) => {
  const { name } = req.params;

  const pkg = await packageModel.findByName(name);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (!pkg.isPublic && (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id))) {
    throw new AppError('Package not found', 404);
  }

  const versions = await versionModel.findByPackageId(pkg.id);
  const downloadStats = await versionModel.getDownloadStats(pkg.id);

  // Create NPM compatible package metadata
  const npmMetadata: any = {
    _id: pkg.name,
    name: pkg.name,
    description: pkg.description || '',
    'dist-tags': {
      latest: versionModel.getLatestVersion(versions)?.version || '0.0.0'
    },
    versions: {},
    time: {
      created: pkg.createdAt.toISOString(),
      modified: pkg.updatedAt.toISOString()
    },
    maintainers: [
      {
        name: pkg.author,
        email: `${pkg.author.toLowerCase().replace(/\s+/g, '.')}@piral-feed-service.com`
      }
    ],
    repository: {
      type: 'git',
      url: `${req.protocol}://${req.get('host')}/packages/${name}`
    },
    homepage: `${req.protocol}://${req.get('host')}/packages/${name}`,
    keywords: ['piral', 'microfrontend'],
    license: 'MIT'
  };

  // Add version information
  versions.forEach(version => {
    const downloadCount = downloadStats[version.version] || 0;
    
    npmMetadata.versions[version.version] = {
      name: pkg.name,
      version: version.version,
      description: pkg.description || '',
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      keywords: ['piral', 'microfrontend'],
      author: pkg.author,
      license: 'MIT',
      dist: {
        tarball: `${req.protocol}://${req.get('host')}/api/versions/${name}/${version.version}/download`,
        shasum: version.checksum || '',
        filesize: version.fileSize || 0
      },
      _id: `${pkg.name}@${version.version}`,
      _npmVersion: '1.0.0',
      _nodeVersion: process.version,
      _npmUser: {
        name: pkg.author,
        email: `${pkg.author.toLowerCase().replace(/\s+/g, '.')}@piral-feed-service.com`
      },
      maintainers: [
        {
          name: pkg.author,
          email: `${pkg.author.toLowerCase().replace(/\s+/g, '.')}@piral-feed-service.com`
        }
      ],
      directories: {},
      publish_time: version.createdAt.getTime(),
      _hasShrinkwrap: false,
      downloads: downloadCount
    };

    npmMetadata.time[version.version] = version.createdAt.toISOString();
  });

  // Add download statistics
  const totalDownloads = Object.values(downloadStats).reduce((sum, count) => sum + count, 0);
  npmMetadata.downloads = {
    latest: totalDownloads,
    lastDay: 0, // Could be implemented with date filtering
    lastWeek: 0, // Could be implemented with date filtering
    lastMonth: 0 // Could be implemented with date filtering
  };

  const response: ApiResponse = {
    success: true,
    data: npmMetadata
  };

  res.json(response);
}));

// Search packages feed
router.get('/search/:query', optionalAuth, asyncHandler(async (req: any, res: Response) => {
  const { query } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const packages = await packageModel.search(query, limit, offset);

  const feedPackages = await Promise.all(
    packages.map(async (pkg) => {
      const versions = await versionModel.findByPackageId(pkg.id);
      const latestVersion = versionModel.getLatestVersion(versions);
      const downloadCount = await downloadModel.getPackageDownloadCount(pkg.id);

      return {
        name: pkg.name,
        description: pkg.description,
        version: latestVersion?.version || '0.0.0',
        downloads: downloadCount,
        date: pkg.createdAt.toISOString(),
        links: {
          npm: `${req.protocol}://${req.get('host')}/api/feed/${pkg.name}/npm`,
          homepage: `${req.protocol}://${req.get('host')}/api/packages/${pkg.name}`,
          repository: `${req.protocol}://${req.get('host')}/api/packages/${pkg.name}`,
          bugs: `${req.protocol}://${req.get('host')}/api/packages/${pkg.name}`
        },
        author: {
          name: pkg.author,
          email: `${pkg.author.toLowerCase().replace(/\s+/g, '.')}@piral-feed-service.com`
        },
        publisher: {
          username: pkg.author.toLowerCase().replace(/\s+/g, '.'),
          email: `${pkg.author.toLowerCase().replace(/\s+/g, '.')}@piral-feed-service.com`
        },
        maintainers: [
          {
            username: pkg.author.toLowerCase().replace(/\s+/g, '.'),
            email: `${pkg.author.toLowerCase().replace(/\s+/g, '.')}@piral-feed-service.com`
          }
        ]
      };
    })
  );

  const response: ApiResponse = {
    success: true,
    data: {
      objects: feedPackages,
      total: feedPackages.length,
      time: new Date().toISOString()
    }
  };

  res.json(response);
}));

// Get trending packages
router.get('/trending/list', optionalAuth, asyncHandler(async (req: any, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const days = parseInt(req.query.days as string) || 7;

  // Get download trends for the specified period
  const downloadTrends = await downloadModel.getDownloadTrends(days);
  const popularPackages = await packageModel.getPopular(limit);

  const trendingPackages = await Promise.all(
    popularPackages.map(async (pkg) => {
      const versions = await versionModel.findByPackageId(pkg.id);
      const latestVersion = versionModel.getLatestVersion(versions);
      
      return {
        name: pkg.name,
        description: pkg.description,
        author: pkg.author,
        version: latestVersion?.version || '0.0.0',
        downloads: (pkg as any).download_count || 0,
        isPublic: pkg.isPublic,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt
      };
    })
  );

  const response: ApiResponse = {
    success: true,
    data: {
      packages: trendingPackages,
      trends: downloadTrends,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    }
  };

  res.json(response);
}));

// Get download statistics
router.get('/stats/downloads', optionalAuth, asyncHandler(async (req: any, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const packageFilter = req.query.package as string;

  let downloadStats;
  if (packageFilter) {
    const pkg = await packageModel.findByName(packageFilter);
    if (!pkg) {
      throw new AppError('Package not found', 404);
    }
    
    downloadStats = await downloadModel.getPackageVersionDownloadCounts(pkg.id);
  } else {
    downloadStats = await downloadModel.getOverallStats();
  }

  const response: ApiResponse = {
    success: true,
    data: {
      stats: downloadStats,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    }
  };

  res.json(response);
}));

// Health check for feed service
router.get('/health/status', asyncHandler(async (req: any, res: Response) => {
  const stats = await downloadModel.getOverallStats();
  
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'piral-feed-service',
    version: require('../../package.json').version,
    stats,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  const response: ApiResponse = {
    success: true,
    data: healthStatus
  };

  res.json(response);
}));

export default router;