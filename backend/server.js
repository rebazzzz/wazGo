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
import * as Sentry from '@sentry/node';
import { httpIntegration, consoleIntegration } from '@sentry/node';

import db from './models/index.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';
import logger from './utils/logger.js';
import { swaggerUi, specs } from './swagger.js';
import cron from 'node-cron';
import { backupDatabase, verifyBackup, cleanupOldBackups, getBackupFiles } from './utils/backup.js';

dotenv.config();

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://eddcbdf550c1f2624aa1f6fc3292f463@o4510102162309120.ingest.de.sentry.io/4510102176333904', // Replace with actual DSN
  environment: process.env.NODE_ENV || 'development',
  integrations: [
    httpIntegration({ tracing: true }),
    consoleIntegration(),
  ],
  tracesSampleRate: 1.0,
});

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
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
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
    maxAge: 30 * 60 * 1000 // 30 minutes
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

// Static with cache control
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  lastModified: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
app.use('/admin/static', express.static(path.join(__dirname, 'public', 'admin'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(specs));
app.get('/api-docs.json', (req, res) => res.json(specs));

// CSRF protection for tests
const csrfProtection = csrf({ cookie: true });

if (process.env.NODE_ENV === 'test') {
  app.get('/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
}

// Routes
app.use('/contact', contactRoutes);
app.use('/admin', adminRoutes);
app.get("/", (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    logger.error('Health check failed: Database connection error', { error: error.message });
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// Frontend
app.get("/demos", (req, res) => res.sendFile(path.join(__dirname, 'public', 'demos.html')));
app.get("/kontakta_oss", (req, res) => res.sendFile(path.join(__dirname, 'public', 'kontakta_oss.html')));
app.get("/integritetspolicy", (req, res) => res.sendFile(path.join(__dirname, 'public', 'integritetspolicy.html')));

// Global error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', { ip: req.ip, userAgent: req.get('User-Agent') });
    return res.status(403).json({ success: false, error: 'Invalid CSRF token' });
  }
  logger.error('Global error', { error: err.stack, ip: req.ip, url: req.url });
  Sentry.captureException(err);
  if (req.accepts('json')) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  } else {
    res.status(500).send('Internal server error');
  }
});

// Seed admin user if not exists
const seedAdminUser = async () => {
  const { User } = db;
  const adminEmail = 'admin@wazgo.se';
  const defaultPassword = 'TempSecurePass123!'; // Strong default password, change immediately after first login

  try {
    const admin = await User.findOne({ where: { email: adminEmail } });
    if (!admin) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await User.create({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Admin user created with default password: TempSecurePass123!. Please change it immediately.');
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

  // Schedule automated backups
  // Daily full backup at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Starting scheduled database backup...');
      await backupDatabase();
      console.log('Scheduled database backup completed.');
    } catch (error) {
      console.error('Scheduled database backup failed:', error);
    }
  });

  // Weekly backup verification on Sundays at 3:00 AM
  cron.schedule('0 3 * * 0', async () => {
    try {
      console.log('Starting scheduled backup verification...');
      const backups = getBackupFiles();
      if (backups.length > 0) {
        // Verify the latest backup
        const latestBackup = path.join(__dirname, 'backups', backups.sort().pop());
        await verifyBackup(latestBackup);
        console.log('Scheduled backup verification completed.');
      } else {
        console.log('No backups found for verification.');
      }
    } catch (error) {
      console.error('Scheduled backup verification failed:', error);
    }
  });

  // Monthly cleanup of old backups on the 1st at 4:00 AM
  cron.schedule('0 4 1 * *', async () => {
    try {
      console.log('Starting scheduled backup cleanup...');
      await cleanupOldBackups();
      console.log('Scheduled backup cleanup completed.');
    } catch (error) {
      console.error('Scheduled backup cleanup failed:', error);
    }
  });

  console.log('Automated backup schedules initialized.');
});
