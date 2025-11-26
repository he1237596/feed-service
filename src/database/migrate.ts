import { Database } from './Database';
import { logger } from '../utils/logger';

export async function migrate(): Promise<void> {
  const database = new Database();
  
  try {
    await database.initialize();
    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}