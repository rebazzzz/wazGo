import request from 'supertest';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import bodyParser from 'body-parser';
import csrf from 'csurf';
import path from 'path';
import db from '../../models/index.js';
import adminRoutes from '../../routes/admin.js';

const { User } = db;

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'backend/views'));
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

describe('Authentication Tests', () => {
  let csrfToken;
  let agent;

  beforeAll(async () => {
    await db.syncDB({ force: true });
    // Create test user
    await User.create({
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });
    agent = request.agent(app);
    const tokenRes = await agent.get('/csrf-token');
    csrfToken = tokenRes.body.csrfToken;
  });

  it('should login with valid credentials', async () => {
    const res = await agent
      .post('/admin/login')
      .send({ email: 'admin@test.com', password: 'password123', _csrf: csrfToken })
      .expect(302);
    expect(res.headers.location).toBe('/admin/dashboard');
  });

  it('should fail login with invalid credentials', async () => {
    const res = await agent
      .post('/admin/login')
      .send({ email: 'admin@test.com', password: 'wrong', _csrf: csrfToken })
      .expect(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  it('should lock account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await agent
        .post('/admin/login')
        .send({ email: 'admin@test.com', password: 'wrong', _csrf: csrfToken });
    }
    const res = await agent
      .post('/admin/login')
      .send({ email: 'admin@test.com', password: 'password123', _csrf: csrfToken })
      .expect(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  it('should reset failed attempts on successful login', async () => {
    // First, fail a few times
    for (let i = 0; i < 3; i++) {
      await agent
        .post('/admin/login')
        .send({ email: 'admin@test.com', password: 'wrong', _csrf: csrfToken });
    }
    // Then succeed
    await agent
      .post('/admin/login')
      .send({ email: 'admin@test.com', password: 'password123', _csrf: csrfToken });
    // Check user failedAttempts reset
    const user = await User.findOne({ where: { email: 'admin@test.com' } });
    expect(user.failedAttempts).toBe(0);
  });
});
