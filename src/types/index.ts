export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  author: string;
  authorId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Version {
  id: string;
  packageId: string;
  version: string;
  changelog?: string;
  isLatest: boolean;
  isDeprecated: boolean;
  filePath?: string;
  fileSize?: number;
  checksum?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Download {
  id: string;
  versionId: string;
  packageId: string;
  version: string;
  ipAddress: string;
  userAgent?: string;
  downloadedAt: Date;
}

export interface AuthToken {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PackageWithVersions extends Package {
  versions: Version[];
  downloads: number;
  latestVersion?: string;
}

export interface FeedInfo {
  name: string;
  description?: string;
  versions: FeedVersion[];
  latest: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedVersion {
  version: string;
  changelog?: string;
  isDeprecated: boolean;
  isLatest: boolean;
  createdAt: string;
  downloadUrl: string;
  size?: number;
  checksum?: string;
}

export interface SearchQuery {
  q?: string;
  author?: string;
  tag?: string;
  sort?: 'name' | 'created' | 'updated' | 'downloads';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UploadResponse {
  package: Package;
  version: Version;
  warnings?: string[];
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  timestamp: string;
  path: string;
}