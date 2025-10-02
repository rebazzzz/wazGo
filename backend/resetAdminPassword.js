import db from './models/index.js';

const { User } = db;

async function resetAdminPassword(email, newPassword) {
  if (!email || !newPassword) {
    console.log('Usage: node resetAdminPassword.js <email> <newPassword>');
    process.exit(1);
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found');
      return;
    }

    user.password = newPassword;
    user.failedAttempts = 0;
    user.lockUntil = null;
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    console.log(`Password reset for ${email}. New password: ${newPassword}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

const email = process.argv[2];
const newPassword = process.argv[3];
resetAdminPassword(email, newPassword);
