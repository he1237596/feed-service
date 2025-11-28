const { Database } = require('./dist/database/Database');
const { UserModel } = require('./dist/database/models/User');
const { PackageModel } = require('./dist/database/models/Package'); 
const { VersionModel } = require('./dist/database/models/Version');

async function seed() {
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
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log(`Admin user already exists: ${adminEmail}`);
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
        
        console.log(`Sample package created: ${pkg.name}`);
      } else {
        console.log(`Sample package already exists: ${pkg.name}`);
      }
    }

    console.log('Database seeding completed successfully');
    
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

seed();