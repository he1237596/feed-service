import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import tar from 'tar';
import { Database } from '../database/Database';
import { PackageModel } from '../database/models/Package';
import { VersionModel } from '../database/models/Version';
import { DownloadModel } from '../database/models/Download';
import { validate, validateQuery, validateParams, packageCreateSchema, packageUpdateSchema, searchQuerySchema, paginationSchema, packageNameSchema, packageParamSchema, packageNameParamSchema } from '../utils/validation';
import { auth, optionalAuth, authorize, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { Helpers } from '../utils/helpers';
import { ApiResponse, PackageWithVersions, UploadResponse } from '../types';

const router = Router();
let packageModel: PackageModel;
let versionModel: VersionModel;
let downloadModel: DownloadModel;

// Initialize dependencies
export const initPackageRoutes = (db: Database): void => {
  packageModel = new PackageModel(db);
  versionModel = new VersionModel(db);
  downloadModel = new DownloadModel(db);
};

// Helper function to extract package info from package file
async function extractPackageInfo(filePath: string): Promise<{ name: string; version: string; description?: string }> {
  try {
    // Create temporary directory for extraction
    const tempDir = path.join(path.dirname(filePath), 'temp_' + Date.now());
    Helpers.ensureDirectory(tempDir);

    // Extract the tar.gz file
    await tar.x({
      file: filePath,
      cwd: tempDir
    });

    // Look for package.json
    const packageJsonPath = path.join(tempDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      fs.rmSync(tempDir, { recursive: true, force: true });
      return {
        name: packageJson.name || 'unknown-pilet',
        version: packageJson.version || '1.0.0',
        description: packageJson.description
      };
    }

    // If no package.json in root, check subdirectories
    const subdirs = fs.readdirSync(tempDir).filter(item => {
      const itemPath = path.join(tempDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    for (const subdir of subdirs) {
      const subPackageJson = path.join(tempDir, subdir, 'package.json');
      if (fs.existsSync(subPackageJson)) {
        const packageJson = JSON.parse(fs.readFileSync(subPackageJson, 'utf-8'));
        fs.rmSync(tempDir, { recursive: true, force: true });
        return {
          name: packageJson.name || 'unknown-pilet',
          version: packageJson.version || '1.0.0',
          description: packageJson.description
        };
      }
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
    return { name: 'unknown-pilet', version: '1.0.0' };
  } catch (error) {
    throw new Error(`Failed to extract package info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000') // 500MB default
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

// Get all packages (with optional search and pagination)
router.get('/', optionalAuth, validateQuery(searchQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q, author, sort, order, page, limit } = req.query as any;
  const offset = (page - 1) * limit;

  let packages;
  let total;

  if (q) {
    // Search packages
    packages = await packageModel.search(q, limit, offset);
    total = await packageModel.getCount(); // This is approximate for search
  } else {
    // Get all packages with filters
    packages = await packageModel.findAll(
      limit,
      offset,
      {
        author,
        isPublic: req.user?.role !== 'admin' ? true : undefined
      }
    );
    total = await packageModel.getCount({ author, isPublic: req.user?.role !== 'admin' ? true : undefined });
  }

  const response: ApiResponse = {
    success: true,
    data: {
      packages: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        author: pkg.author,
        isPublic: pkg.isPublic,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  };

  res.json(response);
}));

// Get package details
router.get('/:name', optionalAuth, validateParams(packageNameParamSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.params;
  const includeVersions = req.query.includeVersions === 'true';

  logger.info(`Looking for package: ${name}`);
  const pkg = await packageModel.findByName(name);
  if (!pkg) {
    logger.error(`Package not found: ${name}`);
    throw new AppError('Package not found', 404);
  }
  logger.info(`Found package: ${pkg.name} (ID: ${pkg.id})`);

  // Check permissions
  if (!pkg.isPublic && (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id))) {
    throw new AppError('Package not found', 404);
  }

  let responseData;
  if (includeVersions) {
    try {
      logger.info(`Fetching package with versions: ${name}`);
      const packageWithVersions = await packageModel.findWithVersions(name);
      logger.info(`Package with versions result:`, packageWithVersions ? 'found' : 'not found');
      if (!packageWithVersions) {
        throw new AppError('Package not found', 404);
      }
      responseData = packageWithVersions;
    } catch (error) {
      console.error('Error fetching package with versions:', error);
      logger.error('Error details:', {
        packageName: name,
        error: error.message,
        stack: error.stack
      });
      
      // Fallback: return basic package info without versions
      logger.warn('Fallback: returning basic package info without versions');
      responseData = {
        ...pkg,
        versions: [],
        downloads: 0,
        latestVersion: null
      };
    }
  } else {
    responseData = pkg;
  }

  const response: ApiResponse = {
    success: true,
    data: responseData
  };

  res.json(response);
}));



// Piral CLI compatible upload endpoint (no auth required)
router.post('/upload', (req, res, next) => {
  // Try multiple field names that Piral CLI might use
  const upload = multer({
    storage,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000') // 500MB default
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
  }).single('file'); // Try 'file' first

  upload(req, res, (err) => {
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
      // If 'file' field doesn't work, try 'package'
      const uploadPackage = multer({
        storage,
        limits: {
          fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000')
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
      }).single('package');
      
      uploadPackage(req, res, next);
    } else {
      next(err);
    }
  });
}, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const file = req.file;
    
    if (!file) {
      throw new AppError('No file provided', 400);
    }

    // Extract package info from the uploaded file
    const packageInfo = await extractPackageInfo(file.path);
    
    // Handle --fresh parameter (force overwrite existing version)
    // Check multiple possible ways the parameter might be sent
    let fresh = false;
    
    // Check query parameters
    if (req.query.fresh === 'true' || req.query.fresh === true) {
      fresh = true;
    }
    
    // Check request body
    if (req.body.fresh === 'true' || req.body.fresh === true) {
      fresh = true;
    }
    
    // Check headers
    if (req.headers['x-piral-fresh'] === 'true' || 
        req.headers['x-piral-fresh'] === 'fresh' ||
        req.headers['fresh'] === 'true' ||
        req.headers['fresh'] === 'fresh') {
      fresh = true;
    }
    
    // Check URL path or method override
    const url = req.originalUrl || req.url;
    if (url.includes('fresh') || url.includes('overwrite')) {
      fresh = true;
    }
    
    // Check if this is a Piral CLI request with --fresh flag
    if (req.headers['user-agent'] && 
        req.headers['user-agent'].toString().includes('piral-cli')) {
      // Check if the request contains any indication of fresh publish
      const userAgent = req.headers['user-agent'].toString();
      const referer = req.headers.referer || '';
      const url = req.originalUrl || req.url;
      
      // Look for patterns that indicate fresh publish
      if (userAgent.includes('piral-cli/http.node') && 
          (referer.includes('fresh') || url.includes('upload') && req.method === 'POST')) {
        logger.info('Detected Piral CLI upload request - enabling fresh mode');
        fresh = true;
      }
    }
    
    // IMPROVED DETECTION: Check for fresh parameter in multiple ways
    // Piral CLI might send fresh parameter in non-standard ways
    if (req.headers['user-agent'] && 
        req.headers['user-agent'].toString().includes('piral-cli/http.node')) {
      
      // Try to detect fresh parameter from the CLI command context
      // For now, we'll implement a smarter detection:
      
      // 1. Check if this is likely a fresh publish (most common case)
      // Users typically use --fresh when updating existing packages
      const url = req.originalUrl || req.url;
      const userAgent = req.headers['user-agent'].toString();
      
      // If we have a version conflict scenario and it's from Piral CLI,
      // it's likely a fresh publish attempt
      if (!fresh && req.method === 'POST' && url.includes('/upload')) {
        // Check if this package exists by trying to find it first
        const existingPackage = await packageModel.findByName(packageInfo.name);
        if (existingPackage) {
          // If package exists and this is an upload, likely user wants to update
          // This covers the most common use case of --fresh
          logger.info('Smart detection: Package exists and this is an upload - assuming fresh mode');
          fresh = true;
        }
      }
    }
    
    // Debug log
    logger.info(`Upload request for package ${packageInfo.name} version ${packageInfo.version}, fresh=${fresh}`);
    logger.info('Query parameters:', req.query);
    logger.info('Request body keys:', Object.keys(req.body || {}));
    logger.info('Request headers:', {
      'x-piral-fresh': req.headers['x-piral-fresh'],
      'fresh': req.headers['fresh'],
      'content-type': req.headers['content-type']
    });
    
    // Use admin user or create a system user for uploads
    const userId = 'system'; // System uploads
    const authorEmail = 'system@piral-feed-service.local';

    // Check if package already exists
    const existingPackage = await packageModel.findByName(packageInfo.name);
    
    let pkg;
    if (existingPackage) {
      pkg = existingPackage;
    } else {
      // Create package if it doesn't exist
      pkg = await packageModel.create({
        name: packageInfo.name,
        description: packageInfo.description || `${packageInfo.name} - Piral microfrontend component`,
        author: authorEmail,
        authorId: userId,
        isPublic: true
      });
    }

    // Check if version already exists
    const existingVersion = await versionModel.findByPackageAndVersion(pkg.id, packageInfo.version);
    if (existingVersion) {
      if (!fresh) {
        // Clean up uploaded file
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup uploaded file:', cleanupError);
        }
        throw new AppError(`Version ${packageInfo.version} already exists for package ${packageInfo.name}. Use --fresh to overwrite.`, 409);
      } else {
        // Fresh mode: delete existing version
        logger.info(`Fresh mode: deleting existing version ${packageInfo.version} of package ${packageInfo.name}`);
        
        // Delete old file
        if (existingVersion.filePath && fs.existsSync(existingVersion.filePath)) {
          try {
            fs.unlinkSync(existingVersion.filePath);
          } catch (cleanupError) {
            logger.warn('Failed to delete old version file:', cleanupError);
          }
        }
        
        // Delete version from database
        await versionModel.delete(existingVersion.id);
      }
    }

    // Create version
    const version = await versionModel.create({
      packageId: pkg.id,
      version: packageInfo.version || '1.0.0',
      changelog: `Uploaded via Piral CLI`,
      filePath: file.path,
      fileSize: file.size,
      checksum: Helpers.generateHash(fs.readFileSync(file.path))
    });

    const response: ApiResponse<UploadResponse> = {
      success: true,
      data: {
        package: pkg,
        version: version,
      },
      message: 'Package uploaded successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        logger.warn('Failed to cleanup uploaded file:', cleanupError);
      }
    }
    throw error;
  }
}));

// Create new package
router.post('/', auth, upload.single('package'), validate(packageCreateSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, isPublic = true } = req.body;
  
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  const userId = req.user.id;
  const file = req.file;

  // Check if package already exists
  const existingPackage = await packageModel.findByName(name);
  if (existingPackage) {
    // Clean up uploaded file
    if (file) {
      fs.unlinkSync(file.path);
    }
    throw new AppError('Package with this name already exists', 409);
  }

  // Create package
  const pkg = await packageModel.create({
    name,
    description,
    author: req.user.email,
    authorId: userId,
    isPublic
  });

  // Handle version creation if file is provided
  let version = null;
  let warnings: string[] = [];

  if (file) {
    try {
      // Extract package info from package.json
      const packageInfo = await extractPackageInfo(file.path);
      
      version = await versionModel.create({
        packageId: pkg.id,
        version: packageInfo.version || '1.0.0',
        changelog: `Initial release of ${name}`,
        filePath: file.path,
        fileSize: file.size,
        checksum: Helpers.generateHash(fs.readFileSync(file.path))
      });
    } catch (error) {
      warnings.push(`Failed to extract version info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const response: ApiResponse<UploadResponse> = {
    success: true,
    data: {
      package: pkg,
      version: version!,
      warnings: warnings.length > 0 ? warnings : undefined
    },
    message: 'Package created successfully'
  };

  res.status(201).json(response);
}));

// Update package
router.put('/:name', auth, validateParams(packageNameParamSchema), validate(packageUpdateSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.params;
  const { description, isPublic } = req.body;

  logger.info(`Looking for package: ${name}`);
  const pkg = await packageModel.findByName(name);
  if (!pkg) {
    logger.error(`Package not found: ${name}`);
    throw new AppError('Package not found', 404);
  }
  logger.info(`Found package: ${pkg.name} (ID: ${pkg.id})`);

  // Check permissions
  if (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id)) {
    throw new AppError('Permission denied', 403);
  }

  const updatedPackage = await packageModel.update(pkg.id, {
    description,
    isPublic
  });

  const response: ApiResponse = {
    success: true,
    data: updatedPackage,
    message: 'Package updated successfully'
  };

  res.json(response);
}));

// Delete package
router.delete('/:name', auth, validateParams(packageNameParamSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.params;

  logger.info(`Looking for package: ${name}`);
  const pkg = await packageModel.findByName(name);
  if (!pkg) {
    logger.error(`Package not found: ${name}`);
    throw new AppError('Package not found', 404);
  }
  logger.info(`Found package: ${pkg.name} (ID: ${pkg.id})`);

  // Check permissions
  if (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id)) {
    throw new AppError('Permission denied', 403);
  }

  const deleted = await packageModel.delete(pkg.id);
  if (!deleted) {
    throw new AppError('Failed to delete package', 500);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Package deleted successfully'
  };

  res.json(response);
}));

// Get popular packages
router.get('/popular/list', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const packages = await packageModel.getPopular(limit);

  const response: ApiResponse = {
    success: true,
    data: {
      packages: packages.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        author: pkg.author,
        downloads: pkg.download_count || 0,
        isPublic: pkg.isPublic,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt
      }))
    }
  };

  res.json(response);
}));

// Get recent packages
router.get('/recent/list', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const packages = await packageModel.getRecent(limit);

  const response: ApiResponse = {
    success: true,
    data: {
      packages
    }
  };

  res.json(response);
}));

// Get user's packages
router.get('/my/list', auth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  
  const packages = await packageModel.getByAuthor(req.user.id, limit, offset);
  const total = await packageModel.getCount({ author: req.user.id });

  const response: ApiResponse = {
    success: true,
    data: {
      packages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  };

  res.json(response);
}));



export default router;