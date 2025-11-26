import { Database } from './Database';
import { UserModel } from './models/User';
import { PackageModel } from './models/Package';
import { VersionModel } from './models/Version';
import { logger } from '../utils/logger';

export async function seed(): Promise<void> {
  const database = new Database();
  
  try {
    await database.initialize();
    
    const userModel = new UserModel(database);
    const packageModel = new PackageModel(database);
    const versionModel = new VersionModel(database);

    // Create admin user if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@piral-feed-service.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    
    let adminUser = await userModel.findByEmail(adminEmail);
    if (!adminUser) {
      adminUser = await userModel.create({
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      logger.info(`Admin user created: ${adminEmail}`);
    } else {
      logger.info(`Admin user already exists: ${adminEmail}`);
    }

    // Create sample packages
    const samplePackages = [
      {
        name: 'hello-world-piral',
        description: 'A sample Piral microfrontend application',
        author: 'Demo User',
        authorId: adminUser.id,
        isPublic: true
      },
      {
        name: 'dashboard-widget',
        description: 'A dashboard widget microfrontend',
        author: 'Demo User', 
        authorId: adminUser.id,
        isPublic: true
      },
      {
        name: 'auth-module',
        description: 'Authentication module for Piral applications',
        author: 'Demo User',
        authorId: adminUser.id,
        isPublic: true
      }
    ];

    for (const pkgData of samplePackages) {
      let pkg = await packageModel.findByName(pkgData.name);
      if (!pkg) {
        pkg = await packageModel.create(pkgData);
        
        // Create initial version for each package
        await versionModel.create({
          packageId: pkg.id,
          version: '1.0.0',
          changelog: `Initial release of ${pkg.name}`,
          isDeprecated: false
        });
        
        logger.info(`Sample package created: ${pkg.name}`);
      } else {
        logger.info(`Sample package already exists: ${pkg.name}`);
      }
    }

    logger.info('Database seeding completed successfully');
    
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed();
}