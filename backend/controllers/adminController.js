// controllers/adminController.js
const db = require('../models');
const User = db.User;
const Contact = db.Contact;
const Page = db.Page;

module.exports = {
  showLogin: (req, res) => {
    res.render('admin/login', { error: null });
  },

  doLogin: async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.render('admin/login', { error: 'Fel e-post eller lösenord' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.render('admin/login', { error: 'Fel e-post eller lösenord' });
    req.session.user = { id: user.id, email: user.email, role: user.role };
    return res.redirect('/admin');
  },

  logout: (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
  },

  dashboard: async (req, res) => {
    const count = await Contact.count();
    res.render('admin/dashboard', { count });
  },

  listContacts: async (req, res) => {
    const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
    res.render('admin/contacts', { contacts });
  },

  showEditPage: async (req, res) => {
    const slug = req.params.slug || 'home';
    let page = await Page.findOne({ where: { slug } });
    if (!page) {
      page = await Page.create({ slug, title: '', content: '' });
    }
    res.render('admin/edit_page', { page });
  },

  savePage: async (req, res) => {
    const slug = req.params.slug || 'home';
    let page = await Page.findOne({ where: { slug } });
    if (!page) {
      page = await Page.create({ slug, title: req.body.title, content: req.body.content });
    } else {
      page.title = req.body.title;
      page.content = req.body.content;
      if (req.file) page.image = req.file.path;
      page.updatedAt = new Date();
      await page.save();
    }
    res.redirect('/admin/pages/' + slug);
  }
};
