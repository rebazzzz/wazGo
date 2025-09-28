// controllers/adminController.js
import db from '../models/index.js';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';

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
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Felaktiga inloggningsuppgifter');
      return res.redirect('/admin/login');
    }
    req.session.user = { id: user.id, email: user.email, role: user.role };
    res.redirect('/admin/dashboard');
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
  res.render('admin/login', { title: 'Admin Login', csrfToken: req.csrfToken() });
};

export const showDashboard = async (req, res) => {
  try {
    const contactCount = await Contact.count();
    const pageCount = await Page.count();
    res.render('admin/dashboard', { title: 'Dashboard', contactCount, pageCount, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('admin/dashboard', { title: 'Dashboard', contactCount: 0, pageCount: 0, csrfToken: req.csrfToken() });
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
