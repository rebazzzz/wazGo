// controllers/contactController.js
const db = require('../models');
const { sendContactNotification } = require('../utils/mailer');

const Contact = db.Contact;

const handleContact = async (req, res) => {
  try {
    const { name, email, company, industry, otherIndustry, message } = req.body;
    const filePath = req.file ? req.file.path : null;

    // Basic server-side validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Namn, e-post och meddelande krävs.' });
    }

    const contact = await Contact.create({
      name, email, company, industry, otherIndustry, message, filePath
    });

    // send notification email (fire and forget)
    try {
      await sendContactNotification(contact);
    } catch (mailErr) {
      console.error('Mail send error', mailErr);
    }

    return res.json({ success: true, message: 'Tack! Vi återkommer inom kort.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Serverfel' });
  }
};

module.exports = { handleContact };
