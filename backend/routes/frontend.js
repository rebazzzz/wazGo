// routes/frontend.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const Contact = db.Contact;
const Page = db.Page;

// Hem-sida: läser från Page.slug = 'home' om den finns
router.get('/', async (req, res) => {
  try {
    const page = await Page.findOne({ where: { slug: 'home' } });
    res.render('index', { title: page?.title || 'Hem', page });
  } catch (err) {
    console.error('Frontend index error', err);
    res.render('index', { title: 'Hem', page: null });
  }
});

// Kontaktformulär (GET)
router.get('/kontakta_oss', (req, res) => {
  res.render('kontakta_oss', { title: 'Kontakta oss' });
});

// Kontaktformulär POST - sparar som Contact
router.post('/contact', async (req, res) => {
  try {
    const { name, email, company, industry, otherIndustry, message } = req.body;
    await Contact.create({ name, email, company, industry, otherIndustry, message });
    req.flash('success', 'Tack! Ditt meddelande skickades.');
    return res.redirect('/kontakta_oss');
  } catch (err) {
    console.error('Contact submit error', err);
    req.flash('error', 'Något gick fel. Försök igen.');
    return res.redirect('/kontakta_oss');
  }
});

// Integritetspolicy (GET) - laddar eventuell Page med slug 'integritet'
router.get('/integritetspolicy', async (req, res) => {
  try {
    const page = await Page.findOne({ where: { slug: 'integritet' } });
    res.render('integritetspolicy', { title: page?.title || 'Integritet', page });
  } catch (err) {
    res.render('integritetspolicy', { title: 'Integritet', page: null });
  }
});

module.exports = router;
