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

describe('Admin Routes', () => {
  let csrfToken;

  beforeAll(async () => {
    await db.syncDB({ force: true });
    const tokenRes = await request(app).get('/csrf-token');
    csrfToken = tokenRes.body.csrfToken;
    // Create test user
    await User.create({
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ email: 'admin@test.com', password: 'password123', _csrf: csrfToken })
      .expect(302); // Redirect

    expect(res.headers.location).toBe('/admin/dashboard');
  });

  it('should fail login with invalid credentials', async () => {
    const res = await request(app)
      .post('/admin/login')
      .send({ email: 'admin@test.com', password: 'wrong', _csrf: csrfToken })
      .expect(302);

    expect(res.headers.location).toBe('/admin/login');
  });
});
