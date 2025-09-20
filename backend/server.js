require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');

// DB
const db = require('./models');

// Routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressLayouts);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/static', express.static(path.join(__dirname, 'public', 'static')));

// ---------- Sessions ----------
app.use(session({
  store: new pgSession({
    conString: `postgres://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS)}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`,
    tableName: 'session' // default tabellnamn
  }),
  name: 'wazgo.sid',
  secret: process.env.SESSION_SECRET || 'change_this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true om du kör https
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 dag
  }
}));

// ---------- Rate limiting ----------
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});
app.use(limiter);

// ---------- CSRF ----------
app.use(csrf({ cookie: true }));

// ---------- Flash ----------
app.use(flash());

// ---------- Gör flash, session och csrf tillgängliga i alla views ----------
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.csrfToken = req.csrfToken();
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// ---------- EJS view engine ----------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout'); // default layout.ejs i views-mappen

// ---------- Routes ----------
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', csrfToken: res.locals.csrfToken });
});

// ---------- Start server ----------
(async () => {
  try {
    await db.syncDB(); // initiera databasen + skapa admin user om den saknas
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log('✅ DB connected');
    });
  } catch (err) {
    console.error('❌ Unable to start server', err);
  }
})();
