# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2024-11-28

### Fixed
- ✅ Fixed Docker container startup issue - resolved authMiddleware import problem
- ✅ Added database seeding support for Docker containers  
- ✅ Created seed.js script for containerized environment
- ✅ Fixed TypeScript compilation issues in production builds
- ✅ Updated documentation to reflect correct ports and initialization steps
- ✅ Resolved SQLite package installation in Alpine Linux

### Added
- 🆕 Docker-compatible database seeding script
- 🆕 Automatic admin user creation in Docker environment
- 🆕 Sample packages seeding for demonstration
- 🆕 Updated Docker configuration with proper Alpine package handling

### Updated Documentation
- 📝 README.md - Added Docker initialization steps
- 📝 QUICK_START.md - Updated Docker deployment guide
- 📝 WEB_UI_GUIDE.md - Corrected port information and added Docker access
- 📝 PIRAL_CLI_FIX.md - Updated with initialization steps
- 📝 PIRAL_INTEGRATION_GUIDE.md - Added Docker environment instructions

## [1.0.0] - 2024-01-XX

### Added
- Initial release of Piral Feed Service
- Complete package management system
- Version control with semantic versioning
- User authentication and authorization
- RESTful API with comprehensive endpoints
- SQLite database with full migration support
- File upload and download capabilities
- Package search and filtering
- Download statistics and analytics
- Docker support for containerization
- Development and production Docker configurations
- NPM compatible feed endpoints
- Piral-compatible feed format
- Rate limiting and security features
- Comprehensive logging system
- API documentation and examples
- Health check endpoints
- Database seeding with sample data

### Features
- **Package Management**
  - Create, read, update, delete packages
  - Package visibility controls (public/private)
  - Package search with multiple filters
  - Popular and trending packages lists
  
- **Version Control**
  - Semantic version support
  - Version history and changelogs
  - Latest version management
  - Version deprecation
  
- **Security**
  - JWT-based authentication
  - Role-based authorization (admin/user)
  - Rate limiting per endpoint
  - Input validation and sanitization
  
- **File Management**
  - Secure file uploads
  - File integrity checking with checksums
  - Automatic version extraction from package.json
  - Support for .tgz and .tar.gz formats
  
- **Monitoring**
  - Download statistics
  - Usage analytics
  - Health check endpoints
  - Comprehensive logging
  
- **Docker Support**
  - Multi-stage builds
  - Development and production configurations
  - Docker Compose with optional services
  - Volume management for persistence

### API Endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/packages/*` - Package management
- `/api/versions/*` - Version control
- `/api/feed/*` - Feed service endpoints (Piral compatible)
- `/health` - Health check

### Docker Services
- `feed-service` - Main application
- `nginx` - Reverse proxy (optional)
- `redis` - Caching (optional)
- `prometheus` - Monitoring (optional)
- `grafana` - Dashboard (optional)

### Documentation
- Complete API documentation
- Docker deployment guide
- Development setup instructions
- Configuration reference