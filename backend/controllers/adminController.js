const Admin = require('../models/Admin');
const Contact = require('../models/Contact');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin login
exports.loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ where: { username } });
        if (!admin) return res.status(401).json({ message: 'Fel användarnamn eller lösenord' });

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) return res.status(401).json({ message: 'Fel användarnamn eller lösenord' });

        // Skapa JWT token
        const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.cookie('token', token, { httpOnly: true, secure: false }); // secure:true om HTTPS
        res.json({ message: 'Inloggad', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ett fel uppstod' });
    }
};

// Hämta kontaktformulär
exports.getContacts = async (req, res) => {
    try {
        const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
        res.json(contacts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ett fel uppstod' });
    }
};
