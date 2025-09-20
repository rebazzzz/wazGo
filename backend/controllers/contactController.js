const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');

exports.submitContact = async (req, res) => {
    try {
        const { name, email, company, industry, message } = req.body;
        const newContact = await Contact.create({ name, email, company, industry, message });

        // Skicka e-post notifiering
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `Ny kontaktförfrågan från ${name}`,
            text: `Namn: ${name}\nE-post: ${email}\nFöretag: ${company}\nBransch: ${industry}\nMeddelande: ${message}`
        });

        res.status(201).json({ message: 'Kontakt skickad!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ett fel uppstod.' });
    }
};
