// middleware/auth.js
export function ensureAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    // Användaren är inloggad som admin
    return next();
  } else {
    // Inte inloggad eller inte admin → redirect till login
    req.flash('error', 'Du måste logga in som admin för att komma åt denna sida.');
    return res.redirect('/admin/login');
  }
}
