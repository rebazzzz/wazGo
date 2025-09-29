// controllers/adminController.js
import db from '../models/index.js';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const { User, Contact, Page } = db;

export const doLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/admin/login');
  }
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password, body: req.body });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.warn('Failed login attempt: user not found', { email, ip: req.ip, userAgent: req.get('User-Agent') });
      req.flash('error', 'Felaktiga inloggningsuppgifter');
      return res.redirect('/admin/login');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil - new Date()) / 1000 / 60);
      req.flash('error', `Konto låst på grund av för många misslyckade försök. Försök igen om ${remainingTime} minuter.`);
      return res.redirect('/admin/login');
    }

    if (!(await user.comparePassword(password))) {
      logger.warn('Failed login attempt: wrong password', { email, ip: req.ip, userAgent: req.get('User-Agent') });
      // Increment failed attempts
      user.failedAttempts += 1;
      if (user.failedAttempts >= 5) {
        // Lock account for 15 minutes
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedAttempts = 0; // Reset after lock
        req.flash('error', 'För många misslyckade försök. Konto låst i 15 minuter.');
      } else {
        req.flash('error', 'Felaktiga inloggningsuppgifter');
      }
      await user.save();
      return res.redirect('/admin/login');
    }

    // Successful login: reset failed attempts and unlock
    user.failedAttempts = 0;
    user.lockUntil = null;
    await user.save();

    if (user.twoFactorEnabled) {
      req.session.pending2FA = user.id;
      res.redirect('/admin/verify-2fa');
    } else {
      req.session.user = { id: user.id, email: user.email, role: user.role };
      res.redirect('/admin/dashboard');
    }
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Inloggning misslyckades');
    res.redirect('/admin/login');
  }
};

export const showLogin = (req, res) => {
  if (req.query.passwordChanged) {
    req.flash('success', 'Lösenordet ändrat framgångsrikt. Logga in igen.');
  }
  if (req.query.twofaEnabled) {
    req.flash('success', '2FA aktiverat framgångsrikt. Logga in igen.');
  }
  if (req.query.twofaDisabled) {
    req.flash('success', '2FA inaktiverat framgångsrikt. Logga in igen.');
  }
  res.render('admin/login', { title: 'Admin Login', csrfToken: req.csrfToken() });
};

export const showDashboard = async (req, res) => {
  try {
    const contactCount = await Contact.count();
    const pageCount = await Page.count();
    const user = await User.findByPk(req.session.user.id);
    res.render('admin/dashboard', { title: 'Dashboard', contactCount, pageCount, twoFactorEnabled: user.twoFactorEnabled, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('admin/dashboard', { title: 'Dashboard', contactCount: 0, pageCount: 0, twoFactorEnabled: false, csrfToken: req.csrfToken() });
  }
};

export const showContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
    res.render('admin/contacts', { title: 'Kontakter', contacts, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Contacts error:', err);
    res.render('admin/contacts', { title: 'Kontakter', contacts: [], csrfToken: req.csrfToken() });
  }
};

export const deleteContact = async (req, res) => {
  const { id } = req.body;
  try {
    await Contact.destroy({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ success: false, message: 'Kunde inte radera kontakt' });
  }
};

export const showEditPage = async (req, res) => {
  const { id } = req.params;
  try {
    const page = await Page.findByPk(id);
    if (!page) {
      req.flash('error', 'Sidan hittades inte');
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/edit_page', { title: 'Redigera sida', page, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Edit page error:', err);
    req.flash('error', 'Kunde inte ladda sidan');
    res.redirect('/admin/dashboard');
  }
};

export const updatePage = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    await Page.update({ title, content }, { where: { id } });
    req.flash('success', 'Sidan uppdaterad');
  } catch (err) {
    console.error('Update page error:', err);
    req.flash('error', 'Kunde inte uppdatera sidan');
  }
  res.redirect('/admin/dashboard');
};

export const uploadImage = (req, res) => {
  if (!req.file) {
    req.flash('error', 'Ingen fil vald');
    return res.redirect('/admin/dashboard');
  }
  req.flash('success', 'Bild uppladdad');
  res.redirect('/admin/dashboard');
};

export const showChangePassword = (req, res) => {
  res.render('admin/change_password', { title: 'Ändra Lösenord', csrfToken: req.csrfToken() });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.user.id;

  const trimmedCurrentPassword = currentPassword.trim();
  const trimmedNewPassword = newPassword.trim();
  const trimmedConfirmPassword = confirmPassword.trim();

  if (trimmedNewPassword === trimmedCurrentPassword) {
    req.flash('error', 'Nytt lösenord kan inte vara samma som det nuvarande');
    return res.redirect('/admin/change-password');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/admin/change-password');
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      req.flash('error', 'Användare hittades inte');
      return res.redirect('/admin/change-password');
    }

    if (!(await user.comparePassword(trimmedCurrentPassword))) {
      req.flash('error', 'Fel nuvarande lösenord');
      return res.redirect('/admin/change-password');
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      req.flash('error', 'Lösenorden matchar inte');
      return res.redirect('/admin/change-password');
    }

    // Update password (hooks will hash it)
    user.password = trimmedNewPassword;
    await user.save();

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.redirect('/admin/login');
      }
      res.redirect('/admin/login?passwordChanged=true');
    });
  } catch (err) {
    console.error('Change password error:', err);
    req.flash('error', 'Kunde inte ändra lösenordet');
    res.redirect('/admin/change-password');
  }
};

export const showPages = async (req, res) => {
  try {
    const pages = await Page.findAll({ order: [['title', 'ASC']] });
    res.render('admin/pages', { title: 'Sidor', pages, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Pages error:', err);
    res.render('admin/pages', { title: 'Sidor', pages: [], csrfToken: req.csrfToken() });
  }
};

export const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
};

export const showSetup2FA = (req, res) => {
  res.render('admin/setup_2fa', { title: 'Setup 2FA', csrfToken: req.csrfToken() });
};

export const setup2FA = async (req, res) => {
  const speakeasy = await import('speakeasy');
  const qrcode = await import('qrcode');

  const userId = req.session.user.id;
  const user = await User.findByPk(userId);

  const secret = speakeasy.generateSecret({ name: 'Waz Go Admin', issuer: 'Waz Go' });
  user.twoFactorSecret = secret.base32;
  await user.save();

  const otpauthUrl = speakeasy.otpauthURL({
    secret: user.twoFactorSecret,
    label: 'Waz Go Admin',
    issuer: 'Waz Go'
  });

  qrcode.toDataURL(otpauthUrl, (err, qrCodeUrl) => {
    if (err) {
      req.flash('error', 'Failed to generate QR code');
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/setup_2fa', { title: 'Setup 2FA', qrCodeUrl, secret: user.twoFactorSecret, csrfToken: req.csrfToken() });
  });
};

export const enable2FA = async (req, res) => {
  const { code } = req.body;
  const speakeasy = await import('speakeasy');

  const userId = req.session.user.id;
  const user = await User.findByPk(userId);

  console.log('Enable 2FA - Secret:', user.twoFactorSecret);
  console.log('Enable 2FA - User code:', code.trim());

  const expectedToken = speakeasy.totp({
    secret: user.twoFactorSecret,
    encoding: 'base32'
  });
  console.log('Enable 2FA - Expected token:', expectedToken);

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code.trim(),
    window: 20
  });

  console.log('Enable 2FA - Verified:', verified);

  if (verified) {
    user.twoFactorEnabled = true;
    await user.save();
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.redirect('/admin/login');
      }
      res.redirect('/admin/login?2faEnabled=true');
    });
  } else {
    req.flash('error', 'Invalid 2FA code');
    res.redirect('/admin/setup-2fa');
  }
};

export const disable2FA = async (req, res) => {
  const { code } = req.body;
  const speakeasy = await import('speakeasy');

  const userId = req.session.user.id;
  const user = await User.findByPk(userId);

  console.log('Disable 2FA - Secret:', user.twoFactorSecret);
  console.log('Disable 2FA - User code:', code.trim());

  const expectedToken = speakeasy.totp({
    secret: user.twoFactorSecret,
    encoding: 'base32'
  });
  console.log('Disable 2FA - Expected token:', expectedToken);

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code.trim(),
    window: 20
  });

  console.log('Disable 2FA - Verified:', verified);

  if (verified) {
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null; // Optionally clear the secret
    await user.save();
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.redirect('/admin/login');
      }
      res.redirect('/admin/login?2faDisabled=true');
    });
  } else {
    req.flash('error', 'Invalid 2FA code');
    res.redirect('/admin/dashboard');
  }
};

export const showVerify2FA = (req, res) => {
  if (!req.session.pending2FA) {
    return res.redirect('/admin/login');
  }
  res.render('admin/verify_2fa', { title: 'Verify 2FA', csrfToken: req.csrfToken() });
};

export const verify2FA = async (req, res) => {
  const { code } = req.body;
  const speakeasy = await import('speakeasy');

  if (!req.session.pending2FA) {
    return res.redirect('/admin/login');
  }

  const user = await User.findByPk(req.session.pending2FA);

  console.log('Verify 2FA - Secret:', user.twoFactorSecret);
  console.log('Verify 2FA - User code:', code.trim());

  const expectedToken = speakeasy.totp({
    secret: user.twoFactorSecret,
    encoding: 'base32'
  });
  console.log('Verify 2FA - Expected token:', expectedToken);

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code.trim(),
    window: 20
  });

  console.log('Verify 2FA - Verified:', verified);

  if (verified) {
    req.session.user = { id: user.id, email: user.email, role: user.role };
    delete req.session.pending2FA;
    res.redirect('/admin/dashboard');
  } else {
    req.flash('error', 'Invalid 2FA code');
    res.redirect('/admin/verify-2fa');
  }
};
