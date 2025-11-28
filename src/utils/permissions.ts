import { AuthenticatedRequest } from '../middleware/auth'
import { PackageModel } from '../database/models/Package'
import { AppError } from '../middleware/errorHandler'

/**
 * 检查用户对包的访问权限
 */
export const checkPackageAccess = async (
  req: AuthenticatedRequest,
  pkg: any,
  allowPublic: boolean = true
): Promise<void> => {
  // 检查包是否存在
  if (!pkg) {
    throw new AppError('Package not found', 404)
  }

  // 如果是公开包且允许公开访问，直接通过
  if (allowPublic && pkg.isPublic) {
    return
  }

  // 检查用户认证
  if (!req.user) {
    throw new AppError('Authentication required', 401)
  }

  // 管理员可以访问所有包
  if (req.user.role === 'admin') {
    return
  }

  // 检查包的所有权
  if (pkg.authorId !== req.user.id) {
    throw new AppError('Access denied', 403)
  }
}

/**
 * 检查包是否存在并返回
 */
export const getPackageAndCheckAccess = async (
  req: AuthenticatedRequest,
  packageName: string,
  packageModel: PackageModel,
  allowPublic: boolean = true
): Promise<any> => {
  const pkg = await packageModel.findByName(packageName)
  if (!pkg) {
    throw new AppError('Package not found', 404)
  }
  await checkPackageAccess(req, pkg, allowPublic)
  return pkg
}

/**
 * 检查用户是否为管理员或包所有者
 */
export const canEditPackage = (req: AuthenticatedRequest, pkg: any): boolean => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return pkg.authorId === req.user.id
}

/**
 * 检查用户是否为管理员
 */
export const requireAdmin = (req: AuthenticatedRequest): void => {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403)
  }
}