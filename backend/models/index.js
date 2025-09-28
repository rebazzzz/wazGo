// models/index.js
import sequelize from '../config/database.js';
import Contact from './Contact.js';
import Page from './Page.js';
import User from './User.js';

const db = { sequelize, Contact, Page, User };

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ Databasen är ansluten.');

    const queryInterface = sequelize.getQueryInterface();

    for (const modelName in db) {
      const model = db[modelName];

      // Endast modeller med timestamps: true
      if (model.options && model.options.timestamps) {
        const tableName = model.getTableName();
        const columns = await queryInterface.describeTable(tableName);

        // Skapa kolumner om de saknas
        if (!columns.createdAt) {
          try {
            await queryInterface.addColumn(tableName, 'createdAt', {
              type: 'TIMESTAMP WITH TIME ZONE',
              allowNull: false,
              defaultValue: sequelize.literal('NOW()')
            });
            console.log(`✅ Skapade createdAt för ${tableName}`);
          } catch (e) {
            console.log(`⚠️  Skippade createdAt för ${tableName} (kanske redan finns)`);
          }
        }

        if (!columns.updatedAt) {
          try {
            await queryInterface.addColumn(tableName, 'updatedAt', {
              type: 'TIMESTAMP WITH TIME ZONE',
              allowNull: false,
              defaultValue: sequelize.literal('NOW()')
            });
            console.log(`✅ Skapade updatedAt för ${tableName}`);
          } catch (e) {
            console.log(`⚠️  Skippade updatedAt för ${tableName} (kanske redan finns)`);
          }
        }

        // Fyll NULL-värden med NOW()
        await sequelize.query(
          `UPDATE "${tableName}" 
           SET "createdAt" = COALESCE("createdAt", NOW()), 
               "updatedAt" = COALESCE("updatedAt", NOW())`
        );
        console.log(`✅ Fixade timestamps för tabellen ${tableName}`);
      }
    }

    // Synca alla modeller
    await sequelize.sync({ alter: true });
    console.log('✅ Modellerna syncade.');

    // Skapa admin om den inte finns
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASS;
    if (adminEmail && adminPass) {
      const existing = await db.User.findOne({ where: { email: adminEmail } });
      if (!existing) {
        await db.User.create({ email: adminEmail, password: adminPass, role: 'admin' });
        console.log('Admin user created:', adminEmail);
      }
    }

  } catch (err) {
    console.error('❌ Fel vid databaskoppling eller sync:', err);
  }
}

db.syncDB = syncDB;
export default db;
