import dotenv from 'dotenv';
import db from '../models/index.js';
import bcrypt from 'bcrypt';

dotenv.config();

const { User } = db;

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminEmail || !adminPass) {
      console.log('ADMIN_EMAIL or ADMIN_PASS not set in .env');
      process.exit(1);
    }

    const existing = await User.findOne({ where: { email: adminEmail } });
    if (existing) {
      console.log('Admin user already exists');
    } else {
      const hashedPassword = await bcrypt.hash(adminPass, 10);
      await User.create({ 
        email: adminEmail, 
        password: hashedPassword, 
        role: 'admin' 
      });
      console.log('Admin user created successfully:', adminEmail);
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    await db.sequelize.close();
    process.exit();
  }
})();
