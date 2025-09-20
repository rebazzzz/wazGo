// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendContactNotification(contact) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.SMTP_USER, // send to SMTP_USER (your mailbox) or another
    subject: `Ny kontaktförfrågan från ${contact.name}`,
    text: `${contact.name} (${contact.email}) skickade ett meddelande:\n\n${contact.message}\n\nFöretag: ${contact.company || '-'}\nBransch: ${contact.industry || '-'} ${contact.otherIndustry ? '('+contact.otherIndustry+')' : ''}`,
    html: `<p><strong>${contact.name}</strong> (${contact.email}) skickade ett meddelande:</p>
           <p>${contact.message}</p>
           <p>Företag: ${contact.company || '-'}</p>
           <p>Bransch: ${contact.industry || '-'} ${contact.otherIndustry ? '('+contact.otherIndustry+')' : ''}</p>`
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { transporter, sendContactNotification };
