// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const db = require('./models');
const sequelize = require('./config/database');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/static', express.static(path.join(__dirname, 'public', 'static')));

// sessions stored in Postgres
app.use(session({
  store: new pgSession({
    conString: `postgres://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS)}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`
  }),
  name: 'wazgo.sid',
  secret: process.env.SESSION_SECRET || 'change_this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true if using https
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 dag
  }
}));

// rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});
app.use(limiter);

// CSRF protection (cookie-based token)
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// make csrf token available in locals for EJS or front-end reads
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.session = req.session;
  next();
});

// view engine (EJS) for admin
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// simple root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', csrfToken: res.locals.csrfToken });
});

// start DB and server
(async () => {
  try {
    await db.syncDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('DB connected');
    });
  } catch (err) {
    console.error('Unable to start server', err);
  }
})();
