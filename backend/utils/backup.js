import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import logger from './logger.js';
import db from '../models/index.js';

// Note: For production, consider uploading backups to off-site storage like AWS S3, Google Cloud Storage, or Azure Blob Storage.
// This implementation stores backups locally in a separate directory for simplicity.
// Using Sequelize for data export/import to avoid dependency on pg_dump/pg_restore tools.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Perform a data backup by exporting all data from models to JSON files
 * @returns {Promise<string>} Path to the backup directory
 */
export async function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(BACKUP_DIR, `backup-${timestamp}`);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const { User, Contact, Page } = db;

    // Backup Users
    const users = await User.findAll({ raw: true });
    fs.writeFileSync(path.join(backupDir, 'users.json'), JSON.stringify(users, null, 2));

    // Backup Contacts
    const contacts = await Contact.findAll({ raw: true });
    fs.writeFileSync(path.join(backupDir, 'contacts.json'), JSON.stringify(contacts, null, 2));

    // Backup Pages
    const pages = await Page.findAll({ raw: true });
    fs.writeFileSync(path.join(backupDir, 'pages.json'), JSON.stringify(pages, null, 2));

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      models: ['users', 'contacts', 'pages'],
      recordCounts: {
        users: users.length,
        contacts: contacts.length,
        pages: pages.length
      }
    };
    fs.writeFileSync(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    logger.info(`Database backup created: ${backupDir}`);
    return backupDir;
  } catch (error) {
    logger.error('Database backup failed:', error);
    throw error;
  }
}

/**
 * Restore database from backup directory to a test database
 * @param {string} backupDir - Path to backup directory
 * @param {string} testDbName - Name of test database
 * @returns {Promise<boolean>} Success status
 */
export async function restoreDatabase(backupDir, testDbName = 'wazgo_test_restore') {
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: 'postgres' // Connect to default db to create new one
  });

  try {
    await client.connect();

    // Drop and create test database
    await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
    await client.query(`CREATE DATABASE "${testDbName}"`);

    await client.end();

    // Create a temporary Sequelize instance for test db
    const { Sequelize } = await import('sequelize');
    const testSequelize = new Sequelize(
      testDbName,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
      }
    );

    // Import model constructors
    const UserModel = (await import('../models/User.js')).default;
    const ContactModel = (await import('../models/Contact.js')).default;
    const PageModel = (await import('../models/Page.js')).default;

    const User = UserModel(testSequelize);
    const Contact = ContactModel(testSequelize);
    const Page = PageModel(testSequelize);

    // Sync models (create tables)
    await testSequelize.sync({ force: true });

    // Load data from JSON files
    const usersData = JSON.parse(fs.readFileSync(path.join(backupDir, 'users.json'), 'utf8'));
    const contactsData = JSON.parse(fs.readFileSync(path.join(backupDir, 'contacts.json'), 'utf8'));
    const pagesData = JSON.parse(fs.readFileSync(path.join(backupDir, 'pages.json'), 'utf8'));

    // Restore data
    if (usersData.length > 0) await User.bulkCreate(usersData);
    if (contactsData.length > 0) await Contact.bulkCreate(contactsData);
    if (pagesData.length > 0) await Page.bulkCreate(pagesData);

    await testSequelize.close();

    logger.info(`Database restored to test db: ${testDbName}`);
    return true;
  } catch (error) {
    logger.error('Database restore failed:', error);
    await client.end().catch(() => {});
    throw error;
  }
}

/**
 * Verify backup by restoring to test db and checking data integrity
 * @param {string} backupDir - Path to backup directory
 * @returns {Promise<boolean>} Verification status
 */
export async function verifyBackup(backupDir) {
  const testDbName = `wazgo_verify_${Date.now()}`;

  try {
    await restoreDatabase(backupDir, testDbName);

    // Create a temporary Sequelize instance for test db
    const { Sequelize } = await import('sequelize');
    const testSequelize = new Sequelize(
      testDbName,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
      }
    );

    // Initialize models for querying
    const UserModel = (await import('../models/User.js')).default;
    const ContactModel = (await import('../models/Contact.js')).default;
    const PageModel = (await import('../models/Page.js')).default;

    UserModel(testSequelize);
    ContactModel(testSequelize);
    PageModel(testSequelize);

    // Load metadata
    const metadata = JSON.parse(fs.readFileSync(path.join(backupDir, 'metadata.json'), 'utf8'));

    // Check record counts
    const userCount = await testSequelize.models.User.count();
    const contactCount = await testSequelize.models.Contact.count();
    const pageCount = await testSequelize.models.Page.count();

    if (userCount !== metadata.recordCounts.users) {
      throw new Error(`User count mismatch: expected ${metadata.recordCounts.users}, got ${userCount}`);
    }
    if (contactCount !== metadata.recordCounts.contacts) {
      throw new Error(`Contact count mismatch: expected ${metadata.recordCounts.contacts}, got ${contactCount}`);
    }
    if (pageCount !== metadata.recordCounts.pages) {
      throw new Error(`Page count mismatch: expected ${metadata.recordCounts.pages}, got ${pageCount}`);
    }

    await testSequelize.close();

    // Clean up test db
    const client = new pg.Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: 'postgres'
    });
    await client.connect();
    await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
    await client.end();

    logger.info(`Backup verification successful for: ${backupDir}`);
    return true;
  } catch (error) {
    logger.error('Backup verification failed:', error);

    // Clean up on failure
    try {
      const client = new pg.Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: 'postgres'
      });
      await client.connect();
      await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
      await client.end();
    } catch (cleanupError) {
      logger.error('Failed to clean up test db:', cleanupError);
    }

    throw error;
  }
}

/**
 * Clean up old backups (keep last 30 days)
 */
export async function cleanupOldBackups() {
  try {
    const dirs = fs.readdirSync(BACKUP_DIR).filter(dir => dir.startsWith('backup-'));

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    for (const dir of dirs) {
      const dirPath = path.join(BACKUP_DIR, dir);
      const stats = fs.statSync(dirPath);
      if (now - stats.mtime.getTime() > thirtyDays) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        logger.info(`Old backup deleted: ${dir}`);
      }
    }
  } catch (error) {
    logger.error('Cleanup old backups failed:', error);
  }
}

/**
 * Get list of backup directories
 * @returns {Array<string>} List of backup directories
 */
export function getBackupFiles() {
  try {
    return fs.readdirSync(BACKUP_DIR).filter(dir => dir.startsWith('backup-'));
  } catch (error) {
    logger.error('Failed to list backup directories:', error);
    return [];
  }
}
