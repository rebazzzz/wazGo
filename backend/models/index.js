// models/index.js
import sequelize from '../config/database.js';
import ContactModel from './Contact.js';
import PageModel from './Page.js';
import UserModel from './User.js';

// Initiera modeller
const Contact = ContactModel(sequelize);
const Page = PageModel(sequelize);
const User = UserModel(sequelize);

// Sync-funktion
async function syncDB(options = {}) {
  try {
    await sequelize.authenticate();
    console.log('✅ Databasen är ansluten.');

    // Sync database based on environment
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      if (process.env.NODE_ENV === 'development') {
        // In development, use alter to preserve data on server reset
        await sequelize.sync({ alter: true, ...options });
        console.log('✅ Database synced with alter (development).');
      } else {
        // In test environment, use alter to avoid conflicts
        await sequelize.sync({ alter: true, ...options });
      }
    } else {
      // In production, only sync without dropping
      await sequelize.sync({ alter: true, ...options });
    }
    console.log('✅ Modellerna syncade.');

    // Setup Row Level Security after tables are created
    await setupRLS();
    console.log('✅ Row Level Security aktiverad.');

    // Seed default admin user
    await seedAdminUser();
    console.log('✅ Admin user seeded.');

  } catch (err) {
    console.error('❌ Fel vid databaskoppling eller sync:', err);
    throw err; // Throw to propagate the error
  }
}

// Setup Row Level Security
async function setupRLS() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    // Replace import.meta.url usage for Jest compatibility
    // Use __dirname directly since this file is a CommonJS module
    const __dirname = path.resolve();

    const rlsScriptPath = path.join(__dirname, 'config', 'rls_setup.sql');
    const rlsScript = fs.readFileSync(rlsScriptPath, 'utf8');

    // Execute RLS setup script
    await sequelize.query(rlsScript);
    console.log('✅ RLS policies created successfully.');
  } catch (error) {
    console.error('❌ Failed to setup RLS:', error);
    throw error;
  }
}

// Seed default admin user
async function seedAdminUser() {
  try {
    const existingAdmin = await User.findOne({ where: { email: 'admin@wazgo.se' } });
    if (!existingAdmin) {
      await User.create({
        email: 'admin@wazgo.se',
        password: 'TempSecurePass123!',
        role: 'admin',
        isMainAdmin: true
      });

      console.log('✅ Default admin user created: admin@wazgo.se / admin123');
    } else {
      console.log('✅ Admin user already exists.');
    }
  } catch (error) {
    console.error('❌ Failed to seed admin user:', error);
    throw error;
  }
}

async function testConnection() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  }
}

async function closeDB() {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (err) {
    console.error('❌ Error closing database connection:', err);
  }
}

export default {
  sequelize,
  Contact,
  Page,
  User,
  syncDB,
  testConnection,
  closeDB
};
