export interface User {
  id: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface Package {
  id: string
  name: string
  description?: string
  author: string
  authorId: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  downloads?: number
  latestVersion?: string
  versions?: Version[]
}

export interface Version {
  id: string
  packageId: string
  version: string
  changelog?: string
  isLatest: boolean
  isDeprecated: boolean
  filePath?: string
  fileSize?: number
  checksum?: string
  createdAt: string
  updatedAt: string
  downloads?: number
}

export interface Stats {
  totalPackages: number
  totalVersions: number
  totalDownloads: number
  downloadsToday: number
  downloadsThisWeek: number
  downloadsThisMonth: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}