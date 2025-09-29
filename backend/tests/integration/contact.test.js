import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import csrf from 'csurf';
import contactRoutes from '../../routes/contact.js';

const app = express();
app.use(express.json());
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
app.use('/contact', contactRoutes);

describe('Contact Routes', () => {
  let csrfToken;

  beforeAll(async () => {
    const tokenRes = await request(app).get('/csrf-token');
    csrfToken = tokenRes.body.csrfToken;
  });

  it('should submit contact form successfully', async () => {
    const res = await request(app)
      .post('/contact')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
        _csrf: csrfToken
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/contact')
      .send({
        name: 'Test User',
        email: 'invalid-email',
        message: 'Test message',
        _csrf: csrfToken
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
