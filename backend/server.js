// server.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import flash from 'connect-flash';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import bcrypt from 'bcrypt';

import db from './models/index.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Sessions + flash
app.use(session({
  secret: process.env.SESSION_SECRET || 'hemlignyckel',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(flash());

// Gör flash & session tillgängliga i views
app.use((req, res, next) => {
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error')
  };
  res.locals.session = req.session;
  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin/static', express.static(path.join(__dirname, 'public', 'admin')));

// Routes
app.use('/contact', contactRoutes);
app.use('/admin', adminRoutes);

// Frontend
app.get("/", (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get("/demos", (req, res) => res.sendFile(path.join(__dirname, 'public', 'demos.html')));
app.get("/kontakta_oss", (req, res) => res.sendFile(path.join(__dirname, 'public', 'kontakta_oss.html')));
app.get("/integritetspolicy", (req, res) => res.sendFile(path.join(__dirname, 'public', 'integritetspolicy.html')));

// Seed admin user if not exists
const seedAdminUser = async () => {
  const { User } = db;
  const adminEmail = 'admin@wazgo.se';
  const defaultPassword = 'changeme123'; // Change this immediately after first login

  try {
    const admin = await User.findOne({ where: { email: adminEmail } });
    if (!admin) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await User.create({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Admin user created with default password: changeme123. Please change it immediately.');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (err) {
    console.error('Error seeding admin user:', err);
  }
};

// Start server
app.listen(PORT, async () => {
  await db.syncDB();
  await seedAdminUser();
  console.log(`Server körs på http://localhost:${PORT}`);
});
