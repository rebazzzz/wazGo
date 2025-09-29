import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import bodyParser from 'body-parser';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';
import contactRoutes from '../../routes/contact.js';

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

// Rate limiter (reduced for testing)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2, // limit each IP to 2 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({ success: false, error: 'För många kontaktförfrågningar från din IP-adress. Försök igen om 15 minuter.' });
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/contact', contactLimiter, contactRoutes);

describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    // First request
    const res1 = await request(app)
      .post('/contact')
      .send({
        name: 'Test User 1',
        email: 'test1@example.com',
        message: 'Test message 1'
      })
      .expect(200);

    expect(res1.body.success).toBe(true);

    // Second request (still within limit)
    const res2 = await request(app)
      .post('/contact')
      .send({
        name: 'Test User 2',
        email: 'test2@example.com',
        message: 'Test message 2'
      })
      .expect(200);

    expect(res2.body.success).toBe(true);
  });

  it('should block requests exceeding limit', async () => {
    // Third request (should be blocked)
    const res3 = await request(app)
      .post('/contact')
      .send({
        name: 'Test User 3',
        email: 'test3@example.com',
        message: 'Test message 3'
      })
      .expect(429);

    expect(res3.body.success).toBe(false);
    expect(res3.body.error).toContain('För många kontaktförfrågningar');
  });
});
