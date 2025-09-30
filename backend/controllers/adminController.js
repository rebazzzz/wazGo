// controllers/adminController.js
import db from '../models/index.js';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import NodeCache from 'node-cache';

const { User, Contact, Page } = db;

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Cache with 5 min TTL

/**
 * Renders the admin dashboard with contact and page counts, and 2FA status.
 * Uses caching for counts to reduce DB load.
 * @param {Object} req - Express request object with session user
 * @param {Object} res - Express response object
 * @returns {void} Renders admin/dashboard.ejs with counts and CSRF token
 */
export const showDashboard = async (req, res) => {
  try {
    let contactCount = cache.get('contactCount');
    let pageCount = cache.get('pageCount');
    if (contactCount === undefined) {
      contactCount = await Contact.count();
      cache.set('contactCount', contactCount);
    }
    if (pageCount === undefined) {
      pageCount = await Page.count();
      cache.set('pageCount', pageCount);
    }
    const user = await User.findByPk(req.session.user.id);
    res.render('admin/dashboard', { title: 'Dashboard', contactCount, pageCount, twoFactorEnabled: user.twoFactorEnabled, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('admin/dashboard', { title: 'Dashboard', contactCount: 0, pageCount: 0, twoFactorEnabled: false, csrfToken: req.csrfToken() });
  }
};

/**
 * Renders the contacts page with all contacts ordered by creation date.
 * Uses caching for contacts list to reduce DB load.
 * Cache is invalidated on contact deletion.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Renders admin/contacts.ejs with contacts list and CSRF token
 */
export const showContacts = async (req, res) => {
  try {
    let contacts = cache.get('contactsList');
    if (contacts === undefined) {
      contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
      cache.set('contactsList', contacts);
    }
    res.render('admin/contacts', { title: 'Kontakter', contacts, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Contacts error:', err);
    res.render('admin/contacts', { title: 'Kontakter', contacts: [], csrfToken: req.csrfToken() });
  }
};

/**
 * Deletes a contact by ID and returns JSON response.
 * Invalidates contacts cache on success.
 * @param {Object} req - Express request object with contact ID in body
 * @param {Object} res - Express response object
 * @returns {void} JSON response indicating success or failure
 */
export const deleteContact = async (req, res) => {
  const { id } = req.body;
  try {
    await Contact.destroy({ where: { id } });
    cache.del('contactsList'); // Invalidate cache
    res.json({ success: true });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ success: false, message: 'Kunde inte radera kontakt' });
  }
};

/**
 * Handles user login process including validation, account locking for failed attempts, and 2FA redirection.
 * @param {Object} req - Express request object containing email and password in body
 * @param {Object} res - Express response object
 * @returns {void} Redirects to login, 2FA verification, or dashboard based on login outcome
 */
export const doLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/admin/login');
  }
  const { email, password } = req.body;
  logger.info('Login attempt started', { email, ip: req.ip, userAgent: req.get('User-Agent') });
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

    logger.info('Login successful', { email, ip: req.ip, userAgent: req.get('User-Agent') });

    if (user.twoFactorEnabled) {
      req.session.pending2FA = user.id;
      res.redirect('/admin/verify-2fa');
    } else {
      req.session.user = { id: user.id, email: user.email, role: user.role };
      res.redirect('/admin/dashboard');
    }
  } catch (err) {
    logger.error('Login error', { error: err.message, email, ip: req.ip, userAgent: req.get('User-Agent') });
    req.flash('error', 'Inloggning misslyckades');
    res.redirect('/admin/login');
  }
};

/**
 * Renders the admin login page with flash messages and CSRF token.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Renders admin/login.ejs
 */
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



/**
 * Renders the edit page form for a specific page by ID.
 * @param {Object} req - Express request object with page ID in params
 * @param {Object} res - Express response object
 * @returns {void} Renders admin/edit_page.ejs or redirects if page not found
 */
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

/**
 * Updates a page's title and content by ID.
 * @param {Object} req - Express request object with page ID in params and title/content in body
 * @param {Object} res - Express response object
 * @returns {void} Redirects to dashboard with flash message
 */
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

/**
 * Handles image upload and redirects with flash message.
 * @param {Object} req - Express request object with uploaded file
 * @param {Object} res - Express response object
 * @returns {void} Redirects to dashboard with success or error flash
 */
export const uploadImage = (req, res) => {
  if (!req.file) {
    req.flash('error', 'Ingen fil vald');
    return res.redirect('/admin/dashboard');
  }
  req.flash('success', 'Bild uppladdad');
  res.redirect('/admin/dashboard');
};

/**
 * Renders the change password page with CSRF token.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Renders admin/change_password.ejs
 */
export const showChangePassword = (req, res) => {
  res.render('admin/change_password', { title: 'Ändra Lösenord', csrfToken: req.csrfToken() });
};

/**
 * Changes the user's password after validation. If 2FA is enabled, redirects to verification first.
 * @param {Object} req - Express request object with current and new passwords in body
 * @param {Object} res - Express response object
 * @returns {void} Redirects to 2FA verification, login with flash message, or back to change password on error
 */
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

    // If 2FA is enabled, store password change data and redirect to verification
    if (user.twoFactorEnabled) {
      req.session.pendingPasswordChange = {
        newPassword: trimmedNewPassword,
        userId: userId
      };
      return res.redirect('/admin/verify-2fa?context=password-change');
    }

    // If 2FA is not enabled, proceed with password change directly
    await performPasswordChange(req, res, userId, trimmedNewPassword);
  } catch (err) {
    console.error('Change password error:', err);
    req.flash('error', 'Kunde inte ändra lösenordet');
    res.redirect('/admin/change-password');
  }
};

/**
 * Helper function to perform the actual password change and session destruction.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} userId - User ID
 * @param {string} newPassword - New password to set
 * @returns {void} Redirects to login with success message
 */
const performPasswordChange = async (req, res, userId, newPassword) => {
  try {
    const user = await User.findByPk(userId);
    user.password = newPassword;
    await user.save();

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.redirect('/admin/login');
      }
      res.redirect('/admin/login?passwordChanged=true');
    });
  } catch (err) {
    console.error('Perform password change error:', err);
    req.flash('error', 'Kunde inte ändra lösenordet');
    res.redirect('/admin/change-password');
  }
};

/**
 * Renders the pages list page with all pages ordered by title.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Renders admin/pages.ejs with pages list and CSRF token
 */
export const showPages = async (req, res) => {
  try {
    const pages = await Page.findAll({ order: [['title', 'ASC']] });
    res.render('admin/pages', { title: 'Sidor', pages, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Pages error:', err);
    res.render('admin/pages', { title: 'Sidor', pages: [], csrfToken: req.csrfToken() });
  }
};

/**
 * Destroys the user session and redirects to login.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Redirects to /admin/login
 */
export const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
};

/**
 * Renders the 2FA setup page with CSRF token.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Renders admin/setup_2fa.ejs
 */
export const showSetup2FA = (req, res) => {
  res.render('admin/setup_2fa', { title: 'Setup 2FA', csrfToken: req.csrfToken() });
};

/**
 * Generates a 2FA secret and QR code for setup.
 * @param {Object} req - Express request object with session user
 * @param {Object} res - Express response object
 * @returns {void} Renders setup_2fa.ejs with QR code and secret
 */
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

/**
 * Enables 2FA after verifying the provided code and destroys session.
 * @param {Object} req - Express request object with 2FA code in body
 * @param {Object} res - Express response object
 * @returns {void} Redirects to login with success or back to setup on error
 */
export const enable2FA = async (req, res) => {
  const { code } = req.body;
  const speakeasy = await import('speakeasy');

  const userId = req.session.user.id;
  const user = await User.findByPk(userId);

  logger.info('2FA enable attempt', { userId, ip: req.ip, userAgent: req.get('User-Agent') });

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code.trim(),
    window: 20
  });

  if (verified) {
    user.twoFactorEnabled = true;
    await user.save();
    logger.info('2FA enabled successfully', { userId, ip: req.ip });
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destroy error during 2FA enable', { error: err.message, userId });
        return res.redirect('/admin/login');
      }
      res.redirect('/admin/login?2faEnabled=true');
    });
  } else {
    logger.warn('2FA enable failed: invalid code', { userId, ip: req.ip, userAgent: req.get('User-Agent') });
    req.flash('error', 'Invalid 2FA code');
    res.redirect('/admin/setup-2fa');
  }
};

/**
 * Disables 2FA after verifying the provided code and destroys session.
 * @param {Object} req - Express request object with 2FA code in body
 * @param {Object} res - Express response object
 * @returns {void} Redirects to login with success or back to dashboard on error
 */
export const disable2FA = async (req, res) => {
  const { code } = req.body;
  const speakeasy = await import('speakeasy');

  const userId = req.session.user.id;
  const user = await User.findByPk(userId);

  logger.info('2FA disable attempt', { userId, ip: req.ip, userAgent: req.get('User-Agent') });

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code.trim(),
    window: 20
  });

  if (verified) {
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null; // Optionally clear the secret
    await user.save();
    logger.info('2FA disabled successfully', { userId, ip: req.ip });
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destroy error during 2FA disable', { error: err.message, userId });
        return res.redirect('/admin/login');
      }
      res.redirect('/admin/login?2faDisabled=true');
    });
  } else {
    logger.warn('2FA disable failed: invalid code', { userId, ip: req.ip, userAgent: req.get('User-Agent') });
    req.flash('error', 'Invalid 2FA code');
    res.redirect('/admin/dashboard');
  }
};

/**
 * Renders the 2FA verification page if pending 2FA or password change in session.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Renders admin/verify_2fa.ejs or redirects to login/dashboard
 */
export const showVerify2FA = (req, res) => {
  const context = req.query.context || 'login';
  let title = 'Verify 2FA';
  let redirectUrl = '/admin/login';

  if (context === 'password-change') {
    title = 'Verify 2FA for Password Change';
    redirectUrl = '/admin/change-password';
  }

  // Check if there's a valid pending operation
  if (context === 'login' && !req.session.pending2FA) {
    return res.redirect('/admin/login');
  } else if (context === 'password-change' && !req.session.pendingPasswordChange) {
    return res.redirect('/admin/dashboard');
  }

  res.render('admin/verify_2fa', {
    title,
    context,
    csrfToken: req.csrfToken()
  });
};

/**
 * Verifies the 2FA code for login or password change.
 * @param {Object} req - Express request object with 2FA code in body
 * @param {Object} res - Express response object
 * @returns {void} Redirects based on context and verification result
 */
export const verify2FA = async (req, res) => {
  const { code } = req.body;
  const context = req.query.context || 'login';
  const speakeasy = await import('speakeasy');

  let userId;
  let user;

  if (context === 'login') {
    if (!req.session.pending2FA) {
      return res.redirect('/admin/login');
    }
    userId = req.session.pending2FA;
  } else if (context === 'password-change') {
    if (!req.session.pendingPasswordChange) {
      return res.redirect('/admin/dashboard');
    }
    userId = req.session.pendingPasswordChange.userId;
  } else {
    return res.redirect('/admin/login');
  }

  user = await User.findByPk(userId);

  logger.info(`2FA verification attempt (${context})`, { userId, ip: req.ip, userAgent: req.get('User-Agent') });

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code.trim(),
    window: 20
  });

  if (verified) {
    logger.info(`2FA verification successful (${context})`, { userId, ip: req.ip });
    if (context === 'login') {
      req.session.user = { id: user.id, email: user.email, role: user.role };
      delete req.session.pending2FA;
      res.redirect('/admin/dashboard');
    } else if (context === 'password-change') {
      const { newPassword } = req.session.pendingPasswordChange;
      delete req.session.pendingPasswordChange;
      await performPasswordChange(req, res, userId, newPassword);
    }
  } else {
    logger.warn(`2FA verification failed (${context}): invalid code`, { userId, ip: req.ip, userAgent: req.get('User-Agent') });
    req.flash('error', 'Invalid 2FA code');
    res.redirect(`/admin/verify-2fa?context=${context}`);
  }
};
