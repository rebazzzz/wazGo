const db = require('../models');
const User = db.User;
const Contact = db.Contact;
const Page = db.Page;

module.exports = {

  // Visa login-sidan
  showLogin: (req, res) => {
    res.render('admin/login', {
      title: 'Logga in',
      session: req.session
    });
  },

  // Hantera login
  doLogin: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user) {
        req.flash('error', 'Fel e-post eller lösenord');
        return res.redirect('/admin/login');
      }

      const ok = await user.comparePassword(password);
      if (!ok) {
        req.flash('error', 'Fel e-post eller lösenord');
        return res.redirect('/admin/login');
      }

      req.session.user = { id: user.id, email: user.email, role: user.role };
      req.flash('success', 'Inloggning lyckades!');
      res.redirect('/admin');
    } catch (err) {
      console.error('Login error:', err);
      req.flash('error', 'Något gick fel, försök igen.');
      res.redirect('/admin/login');
    }
  },

  // Logout
  logout: (req, res) => {
    req.session.destroy(err => {
      if (err) console.error('Logout error:', err);
      res.redirect('/admin/login');
    });
  },

  // Admin-dashboard
  dashboard: async (req, res) => {
    try {
      const count = await Contact.count();
      res.render('admin/dashboard', {
        title: 'Dashboard',
        count,
        session: req.session
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      req.flash('error', 'Kunde inte hämta dashboard-data.');
      res.redirect('/admin/login');
    }
  },

  // Lista kontakter
  listContacts: async (req, res) => {
    try {
      const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
      res.render('admin/contacts', {
        title: 'Kontakter',
        contacts,
        session: req.session
      });
    } catch (err) {
      console.error('Contacts error:', err);
      req.flash('error', 'Kunde inte hämta kontaktlistan.');
      res.redirect('/admin');
    }
  },

  // Visa och skapa/redigera sida
  showEditPage: async (req, res) => {
    try {
      const slug = req.params.slug || 'home';
      let page = await Page.findOne({ where: { slug } });
      if (!page) page = await Page.create({ slug, title: '', content: '' });

      res.render('admin/edit_page', {
        title: `Redigera: ${page.title || slug}`,
        page,
        session: req.session
      });
    } catch (err) {
      console.error('Edit page error:', err);
      req.flash('error', 'Kunde inte hämta sidan.');
      res.redirect('/admin');
    }
  },

  // Spara sida
  savePage: async (req, res) => {
    try {
      const slug = req.params.slug || 'home';
      let page = await Page.findOne({ where: { slug } });

      if (!page) {
        page = await Page.create({
          slug,
          title: req.body.title,
          content: req.body.content,
          image: req.file ? req.file.path : null
        });
      } else {
        page.title = req.body.title;
        page.content = req.body.content;
        if (req.file) page.image = req.file.path;
        page.updatedAt = new Date();
        await page.save();
      }

      req.flash('success', 'Sidan sparades!');
      res.redirect('/admin/pages/' + slug);
    } catch (err) {
      console.error('Save page error:', err);
      req.flash('error', 'Kunde inte spara sidan.');
      res.redirect('/admin');
    }
  }
};
