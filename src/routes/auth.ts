import { Router, Response } from 'express';
import { Database } from '../database/Database';
import { UserModel } from '../database/models/User';
import { validate, userRegistrationSchema, userLoginSchema } from '../utils/validation';
import { authRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { auth, authorize, generateToken, refreshToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const router = Router();
let userModel: UserModel;

// Initialize dependencies
export const initAuthRoutes = (db: Database): void => {
  userModel = new UserModel(db);
  // authMiddleware is already initialized by initAuth in the main app
};

// Register new user
router.post('/register', authRateLimiter, validate(userRegistrationSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, role = 'user' } = req.body;

  // Check if user already exists
  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Create new user
  const user = await userModel.create({
    email,
    password,
    role
  });

  const response: ApiResponse = {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    },
    message: 'User registered successfully'
  };

  res.status(201).json(response);
}));

// User login
router.post('/login', authRateLimiter, validate(userLoginSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  // Verify user credentials
  const user = await userModel.verifyPassword(email, password);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate JWT token
  const token = generateToken(user);

  const response: ApiResponse = {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    },
    message: 'Login successful'
  };

  res.json(response);
}));

// Get current user profile
router.get('/profile', auth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  
  const user = await userModel.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    }
  };

  res.json(response);
}));

// Update user profile
router.put('/profile', auth, validate(userRegistrationSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, role } = req.body;
  
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  const userId = req.user.id;

  // Only admin can change role
  if (role && req.user.role !== 'admin') {
    delete req.body.role;
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== req.user.email) {
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }
  }

  const updatedUser = await userModel.update(userId, { email, role: req.body.role });
  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt
      }
    },
    message: 'Profile updated successfully'
  };

  res.json(response);
}));

// Change password
router.post('/change-password', auth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  
  // Verify current password
  const user = await userModel.verifyPassword(req.user.email, currentPassword);
  if (!user) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Validate new password
  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters long', 400);
  }

  // Change password
  await userModel.changePassword(req.user.id, newPassword);

  const response: ApiResponse = {
    success: true,
    message: 'Password changed successfully'
  };

  res.json(response);
}));

// Refresh token
router.post('/refresh', auth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await refreshToken(req, res);
}));

// Admin: Get all users
router.get('/users', auth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Check admin authorization
  authorize(['admin'])(req, res, () => {});
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const users = await userModel.findAll(limit, offset);
  const total = await userModel.getCount();

  const response: ApiResponse = {
    success: true,
    data: {
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
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

// Admin: Delete user
router.delete('/users/:id', auth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Check admin authorization
  authorize(['admin'])(req, res, () => {});
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  
  // Prevent self-deletion
  if (id === req.user.id) {
    throw new AppError('Cannot delete your own account', 400);
  }

  const deleted = await userModel.delete(id);
  if (!deleted) {
    throw new AppError('User not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    message: 'User deleted successfully'
  };

  res.json(response);
}));

// Admin: Update user role
router.put('/users/:id/role', auth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Check admin authorization
  authorize(['admin'])(req, res, () => {});
  const { id } = req.params;
  const { role } = req.body;

  if (!['admin', 'user'].includes(role)) {
    throw new AppError('Invalid role. Must be "admin" or "user"', 400);
  }

  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  
  // Prevent role change for self
  if (id === req.user.id) {
    throw new AppError('Cannot change your own role', 400);
  }

  const updatedUser = await userModel.update(id, { role });
  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    },
    message: 'User role updated successfully'
  };

  res.json(response);
}));

export default router;