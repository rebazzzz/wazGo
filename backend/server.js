import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import csrf from "csurf";
import cookieParser from "cookie-parser";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import sequelize from './config/database.js';
import Contact from './models/Contact.js';
import contactRoutes from './routes/contact.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// === Middleware ===
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// === CSRF skydd ===
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// === Static frontend ===
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// === Initiera modeller ===
Contact.initModel(sequelize);

// === Kontakt routes ===
app.use('/contact', contactRoutes);

// === Frontend routes ===
app.get("/", (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get("/kontakta_oss", (req, res) => res.sendFile(path.join(__dirname, 'public', 'kontakta_oss.html')));
app.get("/integritetspolicy", (req, res) => res.sendFile(path.join(__dirname, 'public', 'integritetspolicy.html')));

// === Admin routes (EJS) ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Admin login
app.get('/admin/login', (req, res) => {
  res.render('admin/login');
});

// Admin dashboard med alla kontakter
app.get('/admin/contacts', async (req, res) => {
  try {
    const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
    res.render('admin/contacts', { contacts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Fel vid hämtning av kontakter.');
  }
});

// === Start server ===
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Databasen är ansluten.');
  } catch (err) {
    console.error('❌ Fel vid databaskoppling:', err);
  }
  console.log(`Server körs på http://localhost:${PORT}`);
});
