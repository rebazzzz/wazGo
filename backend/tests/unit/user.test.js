import { describe, it, expect, beforeAll } from '@jest/globals';
import db from '../../models/index.js';
import bcrypt from 'bcrypt';

const { User } = db;

describe('User Model', () => {
  beforeAll(async () => {
    await db.syncDB({ force: true });
  });

  it('should create a user with hashed password', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    };

    const user = await User.create(userData);
    expect(user.email).toBe(userData.email);
    expect(user.role).toBe(userData.role);
    expect(user.password).not.toBe(userData.password); // Should be hashed

    // Verify password
    const isValid = await bcrypt.compare(userData.password, user.password);
    expect(isValid).toBe(true);
  });

  it('should compare password correctly', async () => {
    const user = await User.findOne({ where: { email: 'test@example.com' } });
    expect(await user.comparePassword('password123')).toBe(true);
    expect(await user.comparePassword('wrongpassword')).toBe(false);
  });
});
