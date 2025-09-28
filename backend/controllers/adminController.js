
// controllers/adminController.js
import db from '../models/index.js';
import bcrypt from 'bcrypt';

const { User, Contact, Page } = db;

// --- Alla funktioner här ---
export const showLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login',
    csrfToken: req.csrfToken(),
    flash: {
      success: req.flash('success'),
      error: req.flash('error')
    }
  });
};

export const doLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { email: username } });
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Fel användarnamn eller lösenord');
      return res.redirect('/admin/login');
    }
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.flash('success', 'Inloggad!');
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Serverfel');
    res.redirect('/admin/login');
  }
};

export const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
};

export const dashboard = async (req, res) => {
  try {
    const contactCount = await Contact.count();
    const pageCount = await Page.count();
    res.render('admin/dashboard', {
      title: 'Dashboard',
      contactCount,
      pageCount,
      csrfToken: req.csrfToken(),
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Serverfel');
  }
};

export const listContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
    res.render('admin/contacts', {
      title: 'Kontakter',
      contacts,
      csrfToken: req.csrfToken(),
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Serverfel');
  }
};

export const showEditPage = async (req, res) => {
  const slug = req.params.slug || 'index';
  try {
    let page = await Page.findOne({ where: { slug } });
    if (!page) {
      page = { title: '', slug, content: '', imagePath: '' };
    }
    res.render('admin/edit_page', {
      title: 'Redigera sida',
      page,
      csrfToken: req.csrfToken(),
      flash: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Serverfel');
  }
};

export const savePage = async (req, res) => {
  const slug = req.params.slug || 'index';
  const { title, content } = req.body;
  const imagePath = req.file ? req.file.path : null;
  try {
    let page = await Page.findOne({ where: { slug } });
    if (page) {
      page.title = title;
      page.content = content;
      if (imagePath) page.imagePath = imagePath;
      await page.save();
    } else {
      await Page.create({ title, slug, content, imagePath });
    }
    req.flash('success', 'Sidan sparad');
    res.redirect(`/admin/pages/${slug}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Fel vid sparande');
    res.redirect(`/admin/pages/${slug}`);
  }
};

// --- Default-export ---
export default {
  showLogin,
  doLogin,
  logout,
  dashboard,
  listContacts,
  showEditPage,
  savePage
};
