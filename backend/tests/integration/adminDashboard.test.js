import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import bodyParser from 'body-parser';
import db from '../../models/index.js';
import adminRoutes from '../../routes/admin.js';

const { User } = db;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
app.use(flash());
app.use('/admin', adminRoutes);

describe('Admin Dashboard Access', () => {
  let testUser;

  beforeAll(async () => {
    await db.syncDB({ force: true });
    // Create test admin user
    testUser = await User.create({
      email: 'dashboardadmin@example.com',
      password: await require('bcrypt').hash('password123', 10),
      role: 'admin'
    });
  });

  it('should allow authenticated admin to access dashboard', async () => {
    // First login
    await request(app)
      .post('/admin/login')
      .send({ email: testUser.email, password: 'password123' })
      .expect(302);

    // Then access dashboard
    const res = await request(app)
      .get('/admin/dashboard')
      .expect(200);

    expect(res.text).toContain('Admin Dashboard');
  });

  it('should redirect unauthenticated user to login', async () => {
    const res = await request(app)
      .get('/admin/dashboard')
      .expect(302);

    expect(res.headers.location).toBe('/admin/login');
  });

  it('should allow access to contacts page for authenticated admin', async () => {
    // Login first
    await request(app)
      .post('/admin/login')
      .send({ email: testUser.email, password: 'password123' })
      .expect(302);

    // Access contacts
    const res = await request(app)
      .get('/admin/contacts')
      .expect(200);

    expect(res.text).toContain('Contacts');
  });

  it('should allow access to change password page', async () => {
    // Login first
    await request(app)
      .post('/admin/login')
      .send({ email: testUser.email, password: 'password123' })
      .expect(302);

    // Access change password
    const res = await request(app)
      .get('/admin/change-password')
      .expect(200);

    expect(res.text).toContain('Change Password');
  });
});
