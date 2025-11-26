import Joi from 'joi';

// User validation schemas
export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
  role: Joi.string().valid('user', 'admin').default('user')
});

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Package validation schemas
export const packageCreateSchema = Joi.object({
  name: Joi.string().alphanum().min(1).max(50).required(),
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().default(true)
});

export const packageUpdateSchema = Joi.object({
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().optional()
});

// Version validation schemas
export const versionCreateSchema = Joi.object({
  version: Joi.string().pattern(/^\d+\.\d+\.\d+(-.+)?$/).required(),
  changelog: Joi.string().max(1000).optional(),
  isDeprecated: Joi.boolean().default(false)
});

// Search validation schemas
export const searchQuerySchema = Joi.object({
  q: Joi.string().max(100).optional(),
  author: Joi.string().max(50).optional(),
  tag: Joi.string().max(50).optional(),
  sort: Joi.string().valid('name', 'created', 'updated', 'downloads').default('created'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// ID validation schema
export const idSchema = Joi.string().uuid().required();

// Package name validation schema
export const packageNameSchema = Joi.string().alphanum().min(1).max(50).required();

// Package param validation schema (for routes like /:packageName)
export const packageParamSchema = Joi.object({
  packageName: Joi.string().alphanum().min(1).max(50).required()
});

// Package name param validation schema (for routes like /:name)
export const packageNameParamSchema = Joi.object({
  name: Joi.string().alphanum().min(1).max(50).required()
});

// Version validation schema
export const versionSchema = Joi.string().pattern(/^\d+\.\d+\.\d+(-.+)?$/).required();

// Package and version validation schema
export const packageVersionSchema = Joi.object({
  packageName: Joi.string().alphanum().min(1).max(50).required(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+(-.+)?$/).required()
});

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    req.body = value;
    next();
  };
};

// Query validation middleware factory
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Query validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    req.query = value;
    next();
  };
};

// Params validation middleware factory
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Parameter validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    req.params = value;
    next();
  };
};