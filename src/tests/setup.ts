import { Database } from '../database/Database';

let testDatabase: Database;

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DB_PATH = ':memory:';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.LOG_LEVEL = 'error';
  
  testDatabase = new Database();
  await testDatabase.initialize();
});

afterAll(async () => {
  if (testDatabase) {
    await testDatabase.close();
  }
});

beforeEach(async () => {
  // Clean up database before each test
  const db = testDatabase.getDb();
  await new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM downloads', (err) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM versions', (err) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM packages', (err) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM users', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
});

export { testDatabase };