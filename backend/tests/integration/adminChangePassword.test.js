import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import bodyParser from 'body-parser';
import csrf from 'csurf';
import db from '../../models/index.js';
import adminRoutes from '../../routes/admin.js';

const { User } = db;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
app.use(flash());
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
app.use('/admin', adminRoutes);

describe('Admin Change Password Routes', () => {
  let testUser;
  let csrfToken;

  beforeAll(async () => {
    await db.syncDB({ force: true });
    const tokenRes = await request(app).get('/csrf-token');
    csrfToken = tokenRes.body.csrfToken;
    // Create test admin user
    testUser = await User.create({
      email: 'testadmin@example.com',
      password: await require('bcrypt').hash('oldpassword123', 10),
      role: 'admin'
    });
  });

  it('should change password successfully for authenticated user', async () => {
    // First login
    await request(app)
      .post('/admin/login')
      .send({ email: testUser.email, password: 'oldpassword123', _csrf: csrfToken })
      .expect(302);

    const res = await request(app)
      .post('/admin/change-password')
      .send({
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123!',
        confirmPassword: 'newpassword123!',
        _csrf: csrfToken
      })
      .expect(302);

    // Verify redirect to dashboard (success)
    expect(res.headers.location).toBe('/admin/dashboard');

    // Verify password was changed
    const updatedUser = await User.findByPk(testUser.id);
    const isOldValid = await updatedUser.comparePassword('oldpassword123');
    const isNewValid = await updatedUser.comparePassword('newpassword123!');
    expect(isOldValid).toBe(false);
    expect(isNewValid).toBe(true);
  });

  it('should reject invalid current password', async () => {
    // Login first
    await request(app)
      .post('/admin/login')
      .send({ email: testUser.email, password: 'newpassword123!', _csrf: csrfToken })
      .expect(302);

    const res = await request(app)
      .post('/admin/change-password')
      .send({
        currentPassword: 'wrongpassword',
        newPassword: 'anotherpassword123!',
        confirmPassword: 'anotherpassword123!',
        _csrf: csrfToken
      })
      .expect(302);

    // Should redirect back to change password with error
    expect(res.headers.location).toBe('/admin/change-password');
  });

  it('should reject mismatched passwords', async () => {
    // Login first
    await request(app)
      .post('/admin/login')
      .send({ email: testUser.email, password: 'newpassword123!', _csrf: csrfToken })
      .expect(302);

    const res = await request(app)
      .post('/admin/change-password')
      .send({
        currentPassword: 'newpassword123!',
        newPassword: 'mismatch1',
        confirmPassword: 'mismatch2',
        _csrf: csrfToken
      })
      .expect(302);

    expect(res.headers.location).toBe('/admin/change-password');
  });

  it('should reject weak password', async () => {
    // Login first
    await request(app)
      .post('/admin/login')
      .send({ email: testUser.email, password: 'newpassword123!', _csrf: csrfToken })
      .expect(302);

    const res = await request(app)
      .post('/admin/change-password')
      .send({
        currentPassword: 'newpassword123!',
        newPassword: 'weak',
        confirmPassword: 'weak',
        _csrf: csrfToken
      })
      .expect(302);

    expect(res.headers.location).toBe('/admin/change-password');
  });
});
