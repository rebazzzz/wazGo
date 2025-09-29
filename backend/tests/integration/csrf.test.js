import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import bodyParser from 'body-parser';
import csrf from 'csurf';
import contactRoutes from '../../routes/contact.js';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
app.use(flash());

// CSRF protection
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// CSRF token endpoint
app.get('/csrf', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use('/contact', contactRoutes);

describe('CSRF Protection', () => {
  let csrfToken;

  beforeAll(async () => {
    // Get CSRF token
    const tokenRes = await request(app).get('/csrf');
    csrfToken = tokenRes.body.csrfToken;
  });

  it('should accept request with valid CSRF token', async () => {
    const res = await request(app)
      .post('/contact')
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message'
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should reject request without CSRF token', async () => {
    const res = await request(app)
      .post('/contact')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message'
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid CSRF token');
  });

  it('should reject request with invalid CSRF token', async () => {
    const res = await request(app)
      .post('/contact')
      .set('x-csrf-token', 'invalid-token')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message'
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid CSRF token');
  });
});
