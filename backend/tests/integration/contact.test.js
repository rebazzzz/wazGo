import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import contactRoutes from '../../routes/contact.js';

const app = express();
app.use(express.json());
app.use('/contact', contactRoutes);

describe('Contact Routes', () => {
  it('should submit contact form successfully', async () => {
    const res = await request(app)
      .post('/contact')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message'
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
        message: 'Test message'
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
