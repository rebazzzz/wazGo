import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import db from '../../models/index.js';
import contactRoutes from '../../routes/contact.js';

const { Contact } = db;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/contact', contactRoutes);

describe('Contact Submission Tests', () => {
  beforeAll(async () => {
    await db.syncDB({ force: true });
  });

  it('should submit contact form successfully', async () => {
    const res = await request(app)
      .post('/contact/')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        industry: 'restaurant',
        message: 'This is a test message'
      })
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify contact was saved
    const contact = await Contact.findOne({ where: { email: 'test@example.com' } });
    expect(contact).toBeTruthy();
    expect(contact.name).toBe('Test User');
  });

  it('should fail with invalid email', async () => {
    const res = await request(app)
      .post('/contact/')
      .send({
        name: 'Test User',
        email: 'invalid-email',
        company: 'Test Company',
        industry: 'restaurant',
        message: 'Test message'
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should fail with missing fields', async () => {
    const res = await request(app)
      .post('/contact/')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        industry: 'restaurant'
        // missing message
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
