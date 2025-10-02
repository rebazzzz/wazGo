// server.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import session from 'express-session';
import flash from 'connect-flash';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';
import { httpIntegration, consoleIntegration } from '@sentry/node';
import compression from 'compression';
import cluster from 'cluster';
import os from 'os';
import promClient from 'prom-client';

import db from './models/index.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';
import jwtAuth from './middleware/jwtAuth.js';
import logger from './utils/logger.js';
import { swaggerUi, specs } from './swagger.js';
import cron from 'node-cron';
import { backupDatabase, verifyBackup, cleanupOldBackups, getBackupFiles } from './utils/backup.js';

dotenv.config();

// Function to get env var, checking file if *_FILE is set
const getEnvVar = (varName) => {
  const fileVar = `${varName}_FILE`;
  if (process.env[fileVar]) {
    try {
      return fs.readFileSync(process.env[fileVar], 'utf8').trim();
    } catch (err) {
      console.error(`Error reading ${fileVar}:`, err.message);
      process.exit(1);
    }
  }
  return process.env[varName];
};

// Check for required environment variables
const requiredEnvVars = [
  'SESSION_SECRET', 'JWT_SECRET',
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM',
  'RECAPTCHA_SITE_KEY', 'RECAPTCHA_SECRET_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !getEnvVar(varName));
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these environment variables or create a .env file based on .env.example');
  process.exit(1);
}

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

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDuration);

// Sync database
try {
  await db.syncDB();
} catch (error) {
  console.error('Database sync failed, continuing without sync:', error.message);
}

// Clustering for scalability (only in production)
if (process.env.NODE_ENV === 'production' && cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary cluster setting up ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
    console.log('Starting a new worker');
    cluster.fork();
  });
} else {
  // Worker processes
  console.log(`Worker ${process.pid} started`);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google.com", "https://www.gstatic.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "https://www.gstatic.com"],
      frameSrc: ["https://www.google.com"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Request duration middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );
  });
  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cookieParser());

// Sessions + flash
app.use(session({
  secret: getEnvVar('SESSION_SECRET'),
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

// Public JWT endpoint
app.get('/api/v1/auth/public', (req, res) => {
  const token = jwt.sign({ role: 'public' }, getEnvVar('JWT_SECRET'), { expiresIn: '1h' });
  res.json({ token });
});

// Routes
app.use('/api/v1/contact', jwtAuth, contactRoutes);
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

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API for reCAPTCHA site key
app.get('/api/recaptcha-site-key', (req, res) => {
  res.json({ siteKey: process.env.RECAPTCHA_SITE_KEY || '' });
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

// Start server
app.listen(PORT, async () => {
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
}

export default app;
