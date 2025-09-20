const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const sequelize = require('../models/index');

(async () => {
    await sequelize.sync();

    const hashedPassword = await bcrypt.hash('ditt_lösenord', 10);
    const admin = await Admin.create({ username: 'admin', password: hashedPassword });

    console.log('Admin skapad:', admin.username);
    process.exit();
})();
