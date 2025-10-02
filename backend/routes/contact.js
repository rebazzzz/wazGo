// routes/contact.js
import express from 'express';
import nodemailer from 'nodemailer';
import { body, validationResult } from 'express-validator';
import db from '../models/index.js';
import logger from '../utils/logger.js';

const { Contact } = db;

const router = express.Router();

// IP-based rate limiter for contact form
const IP_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const IP_RATE_LIMIT_MAX = 3; // max 3 submissions per IP per window
const ipSubmissions = new Map(); // In-memory store, in production use Redis or DB

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

/**
 * @swagger
 * /api/v1/contact:
 *   post:
 *     summary: Submit contact form
 *     security:
 *       - jwtAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - company
 *               - message
 *               - g-recaptcha-response
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               company:
 *                 type: string
 *                 maxLength: 100
 *               industry:
 *                 type: string
 *                 enum: [restaurant, retail, nonprofit, other]
 *               otherIndustry:
 *                 type: string
 *                 maxLength: 100
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *               g-recaptcha-response:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact form submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tack! Vi har mottagit ditt meddelande."
 *       400:
 *         description: Bad request - validation error or CAPTCHA failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized - invalid JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "No token provided"
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "För många kontaktförfrågningar från denna IP. Försök igen senare."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
router.post('/', contactValidation, async (req, res) => {
  // IP-based rate limiting
  const clientIP = req.ip;
  const now = Date.now();
  if (!ipSubmissions.has(clientIP)) {
    ipSubmissions.set(clientIP, []);
  }
  const submissions = ipSubmissions.get(clientIP);
  const recentSubmissions = submissions.filter(timestamp => now - timestamp < IP_RATE_LIMIT_WINDOW);
  if (recentSubmissions.length >= IP_RATE_LIMIT_MAX) {
    return res.status(429).json({ success: false, error: 'För många kontaktförfrågningar från denna IP. Försök igen senare.' });
  }
  recentSubmissions.push(now);
  ipSubmissions.set(clientIP, recentSubmissions);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  // Verify CAPTCHA
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: req.body['g-recaptcha-response'],
      }),
    });

    const data = await response.json();

    if (!data.success) {
      logger.warn('CAPTCHA verification failed', { errors: data['error-codes'] });
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
