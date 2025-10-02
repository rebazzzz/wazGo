import db from './models/index.js';

const { User } = db;

async function setMainAdmin(email) {
  if (!email) {
    console.log('Usage: node setMainAdmin.js <email>');
    process.exit(1);
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found');
      return;
    }
    user.isMainAdmin = true;
    await user.save();
    console.log(`Set ${email} as main admin`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

const email = process.argv[2];
setMainAdmin(email);
