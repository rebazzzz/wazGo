const nodemailer = require('nodemailer');
const db = require('../models'); // om du vill spara i DB

exports.submitContact = async (req, res) => {
  try {
    const { name, email, company, industry, otherIndustry, message } = req.body;

    // Spara i DB (om du vill)
    await db.Contact.create({
      name,
      email,
      company,
      industry: industry === 'other' ? otherIndustry : industry,
      message
    });

    // Skicka e-post via Gmail
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SMTP_USER, // skickas till dig själv
      subject: `Ny kontaktförfrågan från ${name}`,
      text: `Namn: ${name}\nEmail: ${email}\nFöretag: ${company}\nBransch: ${industry}\nMeddelande:\n${message}`
    });

    req.flash('success', 'Tack för ditt meddelande! Vi återkommer snart.');
    res.redirect('/contact');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Något gick fel, försök igen senare.');
    res.redirect('/contact');
  }
};
