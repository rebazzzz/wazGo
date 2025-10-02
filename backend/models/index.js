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

    // Setup Row Level Security
    await setupRLS();
    console.log('✅ Row Level Security aktiverad.');

    await sequelize.sync({ alter: true, ...options });
    console.log('✅ Modellerna syncade.');

    // Skapa standard admin om den inte finns
    const defaultAdminEmail = 'admin@wazgo.se';
    const defaultAdminPass = '$2b$10$zZWJr2ObEt7ucdPnFaDpMu2BxTZed0MTm6h5RFC.hW5b23Bz.zzCO'; // Ersätt med hashad version av ett starkt lösenord
    const existingAdmin = await User.findOne({ where: { email: defaultAdminEmail } });
    if (!existingAdmin) {
      await User.create({ email: defaultAdminEmail, password: defaultAdminPass, role: 'admin' });
      console.log('Standard admin user created:', defaultAdminEmail);
      console.log('Ändra lösenordet efter första inloggning för säkerhet.');
    } else {
      console.log('Standard admin user already exists:', defaultAdminEmail);
      console.log('Ändra lösenordet om det behövs för säkerhet.');
    }

  } catch (err) {
    console.error('❌ Fel vid databaskoppling eller sync:', err);
  }
}

// Setup Row Level Security
async function setupRLS() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const rlsScriptPath = path.join(__dirname, '..', 'config', 'rls_setup.sql');
    const rlsScript = fs.readFileSync(rlsScriptPath, 'utf8');

    // Execute RLS setup script
    await sequelize.query(rlsScript);
    console.log('✅ RLS policies created successfully.');
  } catch (error) {
    console.error('❌ Failed to setup RLS:', error);
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
