#!/usr/bin/env node

import { Database } from '../src/database/Database';
import { PackageModel } from '../src/database/models/Package';
import { VersionModel } from '../src/database/models/Version';
import fs from 'fs';
import path from 'path';
import { logger } from '../src/utils/logger';

// Enable proper error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Load environment variables
require('dotenv').config();

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  const db = new Database();
  await db.initialize();
  
  const packageModel = new PackageModel(db);
  const versionModel = new VersionModel(db);
  
  try {
    // Get all packages
    const packages = await packageModel.findAll(1000, 0);
    console.log(`Found ${packages.length} packages to check`);
    
    for (const pkg of packages) {
      console.log(`\n📦 Processing package: ${pkg.name}`);
      
      // Get all versions for this package
      const versions = await versionModel.findByPackageId(pkg.id);
      console.log(`  Found ${versions.length} versions`);
      
      for (const version of versions) {
        // Check if file exists
        if (version.filePath) {
          if (!fs.existsSync(version.filePath)) {
            console.log(`  ⚠️  Missing file: ${version.filePath} for version ${version.version}`);
            
            // Delete orphaned version record
            await versionModel.delete(version.id);
            console.log(`  🗑️  Deleted orphaned version: ${version.version}`);
          }
        } else {
          console.log(`  ⚠️  Version ${version.version} has no file path`);
          
          // Delete version without file
          await versionModel.delete(version.id);
          console.log(`  🗑️  Deleted version without file: ${version.version}`);
        }
      }
      
      // Check if package has no versions after cleanup
      const remainingVersions = await versionModel.findByPackageId(pkg.id);
      if (remainingVersions.length === 0) {
        console.log(`  🗑️  Package has no versions, deleting package...`);
        await packageModel.delete(pkg.id);
        console.log(`  ✅ Deleted empty package: ${pkg.name}`);
      }
    }
    
    // Clean up orphaned files in storage directory
    const storagePath = process.env.STORAGE_PATH || './storage';
    if (fs.existsSync(storagePath)) {
      const files = fs.readdirSync(storagePath);
      console.log(`\n📁 Checking ${files.length} files in storage directory: ${storagePath}`);
      
      // Get all file paths from database
      const allVersions = await db.all('SELECT file_path FROM versions WHERE file_path IS NOT NULL');
      const validFilePaths = new Set(allVersions.map(v => v.file_path));
      
      for (const file of files) {
        const filePath = path.join(storagePath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile()) {
          if (!validFilePaths.has(filePath)) {
            console.log(`  🗑️  Orphaned file: ${file}`);
            fs.unlinkSync(filePath);
            console.log(`  ✅ Deleted orphaned file: ${file}`);
          }
        }
      }
    }
    
    console.log('\n✅ Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await db.close();
  }
}

// Run cleanup
cleanupDatabase().catch(console.error);