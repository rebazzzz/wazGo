// models/index.js
const sequelize = require('../config/database');
const Contact = require('./Contact');
const Page = require('./Page');
const User = require('./User');

const db = {
  sequelize,
  Contact,
  Page,
  User
};

// initialize models with sequelize
Contact.initModel(sequelize);
Page.initModel(sequelize);
User.initModel(sequelize);

async function syncDB() {
  await sequelize.authenticate();
  // sync models
  await sequelize.sync({ alter: true }); // alter true under utveckling; i produktion använd migrations
  // Create initial admin user if none
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASS;
  if (adminEmail && adminPass) {
    const existing = await db.User.findOne({ where: { email: adminEmail } });
    if (!existing) {
      await db.User.create({ email: adminEmail, password: adminPass, role: 'admin' });
      console.log('Admin user created:', adminEmail);
    }
  }
}
db.syncDB = syncDB;

module.exports = db;
