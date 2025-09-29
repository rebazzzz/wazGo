import db from '../models/index.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await db.syncDB({ force: true }); // Force sync for clean test DB
});

afterAll(async () => {
  await db.sequelize.close();
});
