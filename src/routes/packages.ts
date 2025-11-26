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

// Helper function to extract version from package file
async function extractVersionFromFile(filePath: string): Promise<{ version: string }> {
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
      return { version: packageJson.version || '1.0.0' };
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
        return { version: packageJson.version || '1.0.0' };
      }
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
    return { version: '1.0.0' };
  } catch (error) {
    throw new Error(`Failed to extract version from package: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const pkg = await packageModel.findByName(name);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

  // Check permissions
  if (!pkg.isPublic && (!req.user || (req.user.role !== 'admin' && pkg.authorId !== req.user.id))) {
    throw new AppError('Package not found', 404);
  }

  let responseData;
  if (includeVersions) {
    const packageWithVersions = await packageModel.findWithVersions(name);
    responseData = packageWithVersions;
  } else {
    responseData = pkg;
  }

  const response: ApiResponse = {
    success: true,
    data: responseData
  };

  res.json(response);
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
      // Extract version from package.json
      const versionInfo = await extractVersionFromFile(file.path);
      
      version = await versionModel.create({
        packageId: pkg.id,
        version: versionInfo.version || '1.0.0',
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

  const pkg = await packageModel.findByName(name);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

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

  const pkg = await packageModel.findByName(name);
  if (!pkg) {
    throw new AppError('Package not found', 404);
  }

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