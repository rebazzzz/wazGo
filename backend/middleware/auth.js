// middleware/auth.js
const auth = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.redirect('/admin/login');
};

export default auth;
