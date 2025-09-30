// routes/contact.js
import express from 'express';
import nodemailer from 'nodemailer';
import { body, validationResult } from 'express-validator';
import csrf from 'csurf';
import db from '../models/index.js';
import logger from '../utils/logger.js';
import Recaptcha from 'google-recaptcha-v2';

const { Contact } = db;

const router = express.Router();

const csrfProtection = csrf({ cookie: true });

// GET CSRF token
router.get('/csrf', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Session-based rate limiter for contact form
const SESSION_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const SESSION_RATE_LIMIT_MAX = 3; // max 3 submissions per session per window

// Validation rules for contact form
const contactValidation = [
  body('name')
    .notEmpty().withMessage('Namn är obligatoriskt.')
    .isLength({ min: 2, max: 100 }).withMessage('Namn måste vara mellan 2 och 100 tecken.')
    .trim()
    .escape(),
  body('email')
    .isEmail().withMessage('Ogiltig e-postadress.')
    .normalizeEmail(),
  body('company')
    .notEmpty().withMessage('Företag är obligatoriskt.')
    .isLength({ max: 100 }).withMessage('Företag får inte vara längre än 100 tecken.')
    .trim()
    .escape(),
  body('industry')
    .optional()
    .isIn(['restaurant', 'retail', 'nonprofit', 'other']).withMessage('Ogiltig bransch.'),
  body('otherIndustry')
    .optional()
    .isLength({ max: 100 }).withMessage('Annan bransch får inte vara längre än 100 tecken.')
    .trim()
    .escape(),
  body('message')
    .notEmpty().withMessage('Meddelande är obligatoriskt.')
    .isLength({ min: 10, max: 1000 }).withMessage('Meddelande måste vara mellan 10 och 1000 tecken.')
    .trim()
    .escape(),
  body('g-recaptcha-response')
    .notEmpty().withMessage('CAPTCHA-verifiering krävs.')
];

router.post('/', csrfProtection, contactValidation, async (req, res) => {
  // Session-based rate limiting
  if (!req.session.contactSubmissions) {
    req.session.contactSubmissions = [];
  }
  const now = Date.now();
  req.session.contactSubmissions = req.session.contactSubmissions.filter(
    timestamp => now - timestamp < SESSION_RATE_LIMIT_WINDOW
  );
  if (req.session.contactSubmissions.length >= SESSION_RATE_LIMIT_MAX) {
    return res.status(429).json({ success: false, error: 'För många kontaktförfrågningar från denna session. Försök igen senare.' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  // Verify CAPTCHA
  try {
    const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY);
    const isValid = await recaptcha.verify(req.body['g-recaptcha-response']);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'CAPTCHA-verifiering misslyckades.' });
    }
  } catch (captchaErr) {
    logger.error('CAPTCHA verification error', { error: captchaErr.message });
    return res.status(500).json({ success: false, error: 'CAPTCHA-verifiering misslyckades.' });
  }

  try {
    const { name, email, company, industry, otherIndustry, message } = req.body;

    logger.info('Contact form submission', {
      name,
      email,
      company,
      industry: industry === 'other' ? otherIndustry : industry,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Spara i databasen
    const savedContact = await Contact.create({
      name,
      email,
      company,
      industry: industry === 'other' ? otherIndustry : industry,
      otherIndustry: industry === 'other' ? otherIndustry : null,
      message
    });

    // Record successful submission for rate limiting
    req.session.contactSubmissions.push(now);

    // Skicka JSON-svar till frontend omedelbart
    res.json({ success: true, message: 'Tack! Vi har mottagit ditt meddelande.' });

    // Skicka emails asynkront i bakgrunden för att inte blockera responsen
    (async () => {
      try {
        // Nodemailer transport
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: false, // true för 465, false för andra portar
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        // Mail till dig
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: process.env.SMTP_TO || process.env.SMTP_USER,
          subject: `Ny kontaktförfrågan från ${name}`,
          text: `Namn: ${name}\nEmail: ${email}\nFöretag: ${company}\nBransch: ${industry}\nMeddelande:\n${message}`
        });

        // Bekräftelsemail till användaren
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: 'Tack för ditt meddelande till Waz Go',
          text: `Hej ${name},\n\nTack för att du kontaktade oss! Vi återkommer snart.\n\nHälsningar,\nWaz Go-teamet`
        });

        console.log('Emails skickade för kontakt:', name);
      } catch (emailErr) {
        console.error('Fel vid email-sändning:', emailErr);
        // Logga felet men skicka inte fel till användaren eftersom DB-sparandet lyckades
      }
    })();

  } catch (err) {
    console.error('Kontaktfel:', err);
    res.status(500).json({ success: false, error: 'Kunde inte skicka meddelande, försök igen senare.' });
  }
});

export default router;
