// routes/contact.js
import express from 'express';
import nodemailer from 'nodemailer';
import db from '../models/index.js';

const { Contact } = db;

const router = express.Router();

// POST /contact – hantera formulär
router.post('/', async (req, res) => {
  try {
    const { name, email, company, industry, otherIndustry, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Alla fält måste fyllas i.' });
    }

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
