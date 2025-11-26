import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Database } from '../database/Database';
import { PackageModel } from '../database/models/Package';
import { VersionModel } from '../database/models/Version';
import { DownloadModel } from '../database/models/Download';
import { validate, validateQuery, validateParams, versionCreateSchema, searchQuerySchema, packageNameSchema, versionSchema, packageVersionSchema, packageParamSchema } from '../utils/validation';
import { auth, optionalAuth, authorize, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { Helpers } from '../utils/helpers';
import { ApiResponse } from '../types';

const router = Router();
let packageModel: PackageModel;
let versionModel: VersionModel;
let downloadModel: DownloadModel;

// Initialize dependencies
export const initVersionRoutes = (db: Database): void => {
  packageModel = new PackageModel(db);
  versionModel = new VersionModel(db);
  downloadModel = new DownloadModel(db);
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.STORAGE_PATH || './storage/uploads';
    Helpers.ensureDirectory(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeFilename = Helpers.generateSafeFilename(file.originalname);
    cb(null, safeFilename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['.tgz', '.tar.gz'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${ext} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// Get versions for a package
router.get('/:packageName', optionalAuth, validateParams(packageParamSchema), validateQuery(searchQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { packageName } = req.params;
  const { page, limit, sort, order } = req.query as any;
  const offset = (page - 1) * limit;

  const pkg = await packageModel.findByName(packageName);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (!pkg.isPublic && (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id))) {
    throw new AppError('Package not found', 404);
  }

  const versions = await versionModel.findByPackageId(pkg.id);
  const downloadStats = await versionModel.getDownloadStats(pkg.id);

  // Combine versions with download stats
  const versionsWithStats = versions.map(version => ({
    ...version,
    downloads: downloadStats[version.version] || 0
  }));

  // Apply sorting
  if (sort === 'version') {
    versionsWithStats.sort((a, b) => {
      const comparison = Helpers.compareVersions(a.version, b.version);
      return order === 'desc' ? -comparison : comparison;
    });
  } else if (sort === 'downloads') {
    versionsWithStats.sort((a, b) => {
      const comparison = (a.downloads || 0) - (b.downloads || 0);
      return order === 'desc' ? -comparison : comparison;
    });
  } else {
    // Default sort by created_at
    versionsWithStats.sort((a, b) => {
      const comparison = a.createdAt.getTime() - b.createdAt.getTime();
      return order === 'desc' ? -comparison : comparison;
    });
  }

  // Apply pagination
  const paginatedVersions = Helpers.paginate(versionsWithStats, page, limit);

  const response: ApiResponse = {
    success: true,
    data: {
      packageName: pkg.name,
      packageDescription: pkg.description,
      author: pkg.author,
      versions: paginatedVersions.items,
      pagination: {
        page,
        limit,
        total: paginatedVersions.total,
        totalPages: paginatedVersions.totalPages
      }
    }
  };

  res.json(response);
}));

// Get specific version details
router.get('/:packageName/:version', optionalAuth, validateParams(packageVersionSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { packageName, version } = req.params;

  const pkg = await packageModel.findByName(packageName);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (!pkg.isPublic && (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id))) {
    throw new AppError('Package not found', 404);
  }

  const versionInfo = await versionModel.findByPackageAndVersion(pkg.id, version);
  if (!versionInfo) {
    throw new AppError('Version not found', 404);
  }

  const downloadCount = await downloadModel.getVersionDownloadCount(versionInfo.id);

  const response: ApiResponse = {
    success: true,
    data: {
      ...versionInfo,
      packageName: pkg.name,
      packageDescription: pkg.description,
      author: pkg.author,
      downloads: downloadCount
    }
  };

  res.json(response);
}));

// Create new version
router.post('/:packageName', auth, upload.single('package'), validateParams(packageParamSchema), validate(versionCreateSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { packageName } = req.params;
  const { version, changelog, isDeprecated = false } = req.body;
  const file = req.file;
  
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  const userId = req.user.id;

  const pkg = await packageModel.findByName(packageName);
  if (!pkg) {
    // Clean up uploaded file
    if (file) {
      fs.unlinkSync(file.path);
    }
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (req.user.role !== 'admin' && pkg.authorId !== userId) {
    // Clean up uploaded file
    if (file) {
      fs.unlinkSync(file.path);
    }
    throw new AppError('Permission denied', 403);
  }

  // Check if version already exists
  const existingVersion = await versionModel.findByPackageAndVersion(pkg.id, version);
  if (existingVersion) {
    // Clean up uploaded file
    if (file) {
      fs.unlinkSync(file.path);
    }
    throw new AppError('Version already exists', 409);
  }

  let filePath, fileSize, checksum;
  if (file) {
    filePath = file.path;
    fileSize = file.size;
    checksum = Helpers.generateHash(fs.readFileSync(file.path));
  }

  // Create version
  const newVersion = await versionModel.create({
    packageId: pkg.id,
    version,
    changelog,
    isDeprecated,
    filePath,
    fileSize,
    checksum
  });

  const response: ApiResponse = {
    success: true,
    data: newVersion,
    message: 'Version created successfully'
  };

  res.status(201).json(response);
}));

// Update version
router.put('/:packageName/:version', auth, validateParams(packageVersionSchema), validate(versionCreateSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { packageName, version } = req.params;
  const { changelog, isDeprecated } = req.body;
  
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  const userId = req.user.id;

  const pkg = await packageModel.findByName(packageName);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (req.user.role !== 'admin' && pkg.authorId !== userId) {
    throw new AppError('Permission denied', 403);
  }

  const versionInfo = await versionModel.findByPackageAndVersion(pkg.id, version);
  if (!versionInfo) {
    throw new AppError('Version not found', 404);
  }

  const updatedVersion = await versionModel.update(versionInfo.id, {
    changelog,
    isDeprecated
  });

  const response: ApiResponse = {
    success: true,
    data: updatedVersion,
    message: 'Version updated successfully'
  };

  res.json(response);
}));

// Delete version
router.delete('/:packageName/:version', auth, validateParams(packageVersionSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { packageName, version } = req.params;
  
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  const userId = req.user.id;

  const pkg = await packageModel.findByName(packageName);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (req.user.role !== 'admin' && pkg.authorId !== userId) {
    throw new AppError('Permission denied', 403);
  }

  const versionInfo = await versionModel.findByPackageAndVersion(pkg.id, version);
  if (!versionInfo) {
    throw new AppError('Version not found', 404);
  }

  // Delete associated file if exists
  if (versionInfo.filePath && fs.existsSync(versionInfo.filePath)) {
    fs.unlinkSync(versionInfo.filePath);
  }

  const deleted = await versionModel.delete(versionInfo.id);
  if (!deleted) {
    throw new AppError('Failed to delete version', 500);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Version deleted successfully'
  };

  res.json(response);
}));

// Set version as latest
router.post('/:packageName/:version/latest', auth, validateParams(packageVersionSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { packageName, version } = req.params;
  
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  const userId = req.user.id;

  const pkg = await packageModel.findByName(packageName);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (req.user.role !== 'admin' && pkg.authorId !== userId) {
    throw new AppError('Permission denied', 403);
  }

  const versionInfo = await versionModel.findByPackageAndVersion(pkg.id, version);
  if (!versionInfo) {
    throw new AppError('Version not found', 404);
  }

  const success = await versionModel.setLatest(pkg.id, versionInfo.id);
  if (!success) {
    throw new AppError('Failed to set version as latest', 500);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Version set as latest successfully'
  };

  res.json(response);
}));

// Download version
router.get('/:packageName/:version/download', optionalAuth, validateParams(packageVersionSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { packageName, version } = req.params;

  const pkg = await packageModel.findByName(packageName);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (!pkg.isPublic && (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id))) {
    throw new AppError('Package not found', 404);
  }

  const versionInfo = await versionModel.findByPackageAndVersion(pkg.id, version);
  if (!versionInfo) {
    throw new AppError('Version not found', 404);
  }

  if (!versionInfo.filePath || !fs.existsSync(versionInfo.filePath)) {
    throw new AppError('Package file not found', 404);
  }

  // Record download
  await downloadModel.create({
    versionId: versionInfo.id,
    packageId: pkg.id,
    version: versionInfo.version,
    ipAddress: Helpers.getClientIp(req),
    userAgent: Helpers.getUserAgent(req)
  });

  // Set headers for file download
  const filename = `${packageName}-${version}.tgz`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', Helpers.getMimeType(versionInfo.filePath));
  res.setHeader('Content-Length', versionInfo.fileSize || 0);

  // Send file
  res.sendFile(path.resolve(versionInfo.filePath));
}));

// Get version download statistics
router.get('/:packageName/:version/stats', validateParams(packageVersionSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { packageName, version } = req.params;

  const pkg = await packageModel.findByName(packageName);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id)) {
    throw new AppError('Permission denied', 403);
  }

  const versionInfo = await versionModel.findByPackageAndVersion(pkg.id, version);
  if (!versionInfo) {
    throw new AppError('Version not found', 404);
  }

  const downloads = await downloadModel.findByVersionId(versionInfo.id);

  const response: ApiResponse = {
    success: true,
    data: {
      version: versionInfo.version,
      totalDownloads: downloads.length,
      recentDownloads: downloads.slice(0, 100) // Last 100 downloads
    }
  };

  res.json(response);
}));

export default router;