import bcrypt from 'bcryptjs';
import { Database } from '../Database';
import { User } from '../../types';
import { Helpers } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export class UserModel {
  constructor(private db: Database) {}

  public async create(userData: {
    email: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<User> {
    const { email, password, role = 'user' } = userData;
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const user: User = {
      id: Helpers.generateId(),
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.db.run(
      `INSERT INTO users (id, email, password, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.password, user.role, user.createdAt.toISOString(), user.updatedAt.toISOString()]
    );

    logger.info(`User created: ${user.email}`);
    return user;
  }

  public async findById(id: string): Promise<User | null> {
    const row = await this.db.get(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    return row ? this.mapRowToUser(row) : null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    return row ? this.mapRowToUser(row) : null;
  }

  public async findAll(limit: number = 20, offset: number = 0): Promise<User[]> {
    const rows = await this.db.all(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return rows.map(row => this.mapRowToUser(row));
  }

  public async update(id: string, updates: Partial<User>): Promise<User | null> {
    const existingUser = await this.findById(id);
    if (!existingUser) return null;

    // Hash password if it's being updated
    if (updates.password) {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      updates.password = await bcrypt.hash(updates.password, saltRounds);
    }

    const updatedUser = {
      ...existingUser,
      ...updates,
      updatedAt: new Date()
    };

    await this.db.run(
      `UPDATE users 
       SET email = ?, password = ?, role = ?, updated_at = ?
       WHERE id = ?`,
      [
        updatedUser.email,
        updatedUser.password,
        updatedUser.role,
        updatedUser.updatedAt.toISOString(),
        id
      ]
    );

    logger.info(`User updated: ${id}`);
    return updatedUser;
  }

  public async delete(id: string): Promise<boolean> {
    const result = await this.db.run('DELETE FROM users WHERE id = ?', [id]);
    const deleted = result.changes! > 0;
    
    if (deleted) {
      logger.info(`User deleted: ${id}`);
    }
    
    return deleted;
  }

  public async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  public async changePassword(id: string, newPassword: string): Promise<boolean> {
    const user = await this.findById(id);
    if (!user) return false;

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.db.run(
      'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
      [hashedPassword, new Date().toISOString(), id]
    );

    logger.info(`Password changed for user: ${id}`);
    return true;
  }

  public async getCount(): Promise<number> {
    const result = await this.db.get('SELECT COUNT(*) as count FROM users');
    return result.count;
  }

  public async search(query: string, limit: number = 20, offset: number = 0): Promise<User[]> {
    const rows = await this.db.all(
      'SELECT * FROM users WHERE email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [`%${query}%`, limit, offset]
    );

    return rows.map(row => this.mapRowToUser(row));
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      role: row.role,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}