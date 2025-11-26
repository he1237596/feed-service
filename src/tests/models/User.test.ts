import { UserModel } from '../../database/models/User';
import { testDatabase } from '../setup';

describe('UserModel', () => {
  let userModel: UserModel;

  beforeAll(() => {
    userModel = new UserModel(testDatabase);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        role: 'user' as const
      };

      const user = await userModel.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.password).not.toBe(userData.password); // Should be hashed
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create an admin user', async () => {
      const userData = {
        email: 'admin@example.com',
        password: 'Admin123!@#',
        role: 'admin' as const
      };

      const user = await userModel.create(userData);

      expect(user.role).toBe('admin');
    });

    it('should hash the password', async () => {
      const userData = {
        email: 'hashtest@example.com',
        password: 'Password123!',
        role: 'user' as const
      };

      const user = await userModel.create(userData);

      expect(user.password).not.toBe(userData.password);
      expect(user.password.length).toBeGreaterThan(50); // bcrypt hash length
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'findme@example.com',
        password: 'Password123!',
        role: 'user' as const
      };

      const createdUser = await userModel.create(userData);
      const foundUser = await userModel.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const user = await userModel.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userData = {
        email: 'findbyid@example.com',
        password: 'Password123!',
        role: 'user' as const
      };

      const createdUser = await userModel.create(userData);
      const foundUser = await userModel.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(userData.email);
    });

    it('should return null for non-existent id', async () => {
      const user = await userModel.findById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const userData = {
        email: 'verify@example.com',
        password: 'CorrectPassword123!',
        role: 'user' as const
      };

      await userModel.create(userData);
      const user = await userModel.verifyPassword(userData.email, userData.password);

      expect(user).toBeDefined();
      expect(user!.email).toBe(userData.email);
    });

    it('should reject incorrect password', async () => {
      const userData = {
        email: 'wrong@example.com',
        password: 'CorrectPassword123!',
        role: 'user' as const
      };

      await userModel.create(userData);
      const user = await userModel.verifyPassword(userData.email, 'WrongPassword123!');

      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user information', async () => {
      const userData = {
        email: 'update@example.com',
        password: 'Password123!',
        role: 'user' as const
      };

      const createdUser = await userModel.create(userData);
      const updates = {
        email: 'updated@example.com',
        role: 'admin' as const
      };

      const updatedUser = await userModel.update(createdUser.id, updates);

      expect(updatedUser).toBeDefined();
      expect(updatedUser!.email).toBe(updates.email);
      expect(updatedUser!.role).toBe(updates.role);
      expect(updatedUser!.updatedAt.getTime()).toBeGreaterThan(createdUser.updatedAt.getTime());
    });

    it('should return null for non-existent user', async () => {
      const updatedUser = await userModel.update('non-existent-id', { email: 'test@example.com' });
      expect(updatedUser).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const userData = {
        email: 'delete@example.com',
        password: 'Password123!',
        role: 'user' as const
      };

      const createdUser = await userModel.create(userData);
      const deleted = await userModel.delete(createdUser.id);

      expect(deleted).toBe(true);

      const foundUser = await userModel.findById(createdUser.id);
      expect(foundUser).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const deleted = await userModel.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Create multiple users
      await userModel.create({ email: 'user1@example.com', password: 'Password123!', role: 'user' });
      await userModel.create({ email: 'user2@example.com', password: 'Password123!', role: 'user' });
      await userModel.create({ email: 'user3@example.com', password: 'Password123!', role: 'user' });

      const users = await userModel.findAll(10, 0);

      expect(users).toHaveLength(3);
      expect(users[0].email).toBeDefined();
    });

    it('should respect pagination', async () => {
      // Create multiple users
      for (let i = 1; i <= 5; i++) {
        await userModel.create({ email: `user${i}@example.com`, password: 'Password123!', role: 'user' });
      }

      const firstPage = await userModel.findAll(2, 0);
      const secondPage = await userModel.findAll(2, 2);

      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(2);
      expect(firstPage[0].email).not.toBe(secondPage[0].email);
    });
  });

  describe('getCount', () => {
    it('should return user count', async () => {
      await userModel.create({ email: 'count1@example.com', password: 'Password123!', role: 'user' });
      await userModel.create({ email: 'count2@example.com', password: 'Password123!', role: 'user' });

      const count = await userModel.getCount();

      expect(count).toBe(2);
    });

    it('should return zero when no users exist', async () => {
      const count = await userModel.getCount();
      expect(count).toBe(0);
    });
  });
});