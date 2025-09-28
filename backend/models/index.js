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

    // Skapa admin om den inte finns
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASS;
    if (adminEmail && adminPass) {
      const existing = await User.findOne({ where: { email: adminEmail } });
      if (!existing) {
        await User.create({ email: adminEmail, password: adminPass, role: 'admin' });
        console.log('Admin user created:', adminEmail);
      }
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
