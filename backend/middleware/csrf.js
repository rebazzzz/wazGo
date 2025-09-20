// middleware/csrf.js
const csurf = require('csurf');

const csrfProtection = csurf({
  cookie: true // CSRF-token i cookie
});

module.exports = csrfProtection;
