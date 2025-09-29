import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import db from '../../models/index.js';

describe('Database Connection', () => {
  beforeAll(async () => {
    await db.syncDB({ force: true });
  });

  afterAll(async () => {
    await db.closeDB();
  });

  it('should connect to database successfully', async () => {
    const isConnected = await db.testConnection();
    expect(isConnected).toBe(true);
  });

  it('should have all required models', () => {
    expect(db.User).toBeDefined();
    expect(db.Contact).toBeDefined();
  });

  it('should sync database without errors', async () => {
    await expect(db.syncDB()).resolves.not.toThrow();
  });

  it('should close database connection', async () => {
    await expect(db.closeDB()).resolves.not.toThrow();
  });
});
