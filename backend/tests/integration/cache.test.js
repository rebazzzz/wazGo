import request from 'supertest';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import bodyParser from 'body-parser';
import csrf from 'csurf';
import path from 'path';
import db from '../../models/index.js';
import adminRoutes from '../../routes/admin.js';

const { Contact, Page, User } = db;

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

describe('Cache behavior tests', () => {
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

  it('should cache dashboard counts and update cache after contact creation', async () => {
    // Login first
    await agent
      .post('/admin/login')
      .send({ email: 'admin@test.com', password: 'password123', _csrf: csrfToken })
      .expect(302);

    // Initial dashboard load - cache miss
    let res = await agent.get('/admin/dashboard');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Dashboard');

    // Create a contact directly in DB
    await Contact.create({ name: 'Test Contact', email: 'test@example.com', message: 'Hello' });

    // Dashboard should still show old count due to cache
    res = await agent.get('/admin/dashboard');
    expect(res.text).toContain('1'); // Because cache TTL is 5 min, count should be 1 now

    // Clear cache by deleting contact and check dashboard updates
    await Contact.destroy({ where: {} });
    res = await agent.get('/admin/dashboard');
    expect(res.text).toContain('0');
  });

  it('should cache contacts list and invalidate on deletion', async () => {
    // Login first
    await agent
      .post('/admin/login')
      .send({ email: 'admin@test.com', password: 'password123', _csrf: csrfToken })
      .expect(302);

    // Add contacts
    await Contact.bulkCreate([
      { name: 'Contact1', email: 'c1@example.com', message: 'Msg1' },
      { name: 'Contact2', email: 'c2@example.com', message: 'Msg2' }
    ]);

    // Load contacts page - cache miss
    let res = await agent.get('/admin/contacts');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Contact1');
    expect(res.text).toContain('Contact2');

    // Delete one contact via API
    const contacts = await Contact.findAll();
    const contactToDelete = contacts[0];
    res = await agent
      .post('/admin/contacts/delete')
      .send({ id: contactToDelete.id, _csrf: csrfToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Load contacts page again - cache should be invalidated and updated
    res = await agent.get('/admin/contacts');
    expect(res.text).not.toContain(contactToDelete.name);
  });
});
