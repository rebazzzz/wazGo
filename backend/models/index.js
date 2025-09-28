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
async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ Databasen är ansluten.');
    await sequelize.sync({ alter: true });
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

export default {
  sequelize,
  Contact,
  Page,
  User,
  syncDB
};
