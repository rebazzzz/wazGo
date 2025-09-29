import { describe, it, expect, beforeAll } from '@jest/globals';
import db from '../../models/index.js';

const { Contact } = db;

describe('Contact Model', () => {
  beforeAll(async () => {
    await db.syncDB({ force: true });
  });

  it('should create a contact with valid data', async () => {
    const contactData = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message'
    };

    const contact = await Contact.create(contactData);
    expect(contact.name).toBe(contactData.name);
    expect(contact.email).toBe(contactData.email);
  });

  it('should validate required fields', async () => {
    await expect(Contact.create({})).rejects.toThrow();
  });
});
