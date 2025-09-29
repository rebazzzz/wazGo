// routes/admin.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import auth from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const csrfProtection = csrf();

// Multer config for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    logger.warn('Suspicious upload attempt', {
      filename: file.originalname,
      mimetype: file.mimetype,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.session.user?.id
    });
    return cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'För många inloggningsförsök, försök igen senare.'
});

// Login
router.get('/login', csrfProtection, adminController.showLogin);
router.post('/login', loginLimiter, csrfProtection, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Lösenord måste vara minst 6 tecken')
], adminController.doLogin);

// 2FA Verify (before auth, since user not logged in yet)
router.get('/verify-2fa', csrfProtection, adminController.showVerify2FA);
router.post('/verify-2fa', csrfProtection, [
  body('code').isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
], adminController.verify2FA);

// Protected routes
router.use(auth);

// Dashboard
router.get('/dashboard', csrfProtection, adminController.showDashboard);

// Change Password
router.get('/change-password', csrfProtection, adminController.showChangePassword);
router.post('/change-password', csrfProtection, [
  body('currentPassword').notEmpty().withMessage('Nuvarande lösenord krävs'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Nytt lösenord måste vara minst 8 tecken')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).withMessage('Nytt lösenord måste innehålla minst en liten bokstav, en stor bokstav, en siffra och ett specialtecken (@$!%*?&).'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Lösenorden matchar inte');
    }
    return true;
  })
], adminController.changePassword);

// Contacts
router.get('/contacts', csrfProtection, adminController.showContacts);
router.post('/contacts/delete', csrfProtection, adminController.deleteContact);

// Pages
router.get('/pages', csrfProtection, adminController.showPages);
router.get('/edit/:id', csrfProtection, adminController.showEditPage);
router.post('/edit/:id', csrfProtection, adminController.updatePage);

// Upload
router.post('/upload', upload.single('image'), adminController.uploadImage);

// Logout
router.get('/logout', adminController.logout);

// 2FA Setup
router.get('/setup-2fa', csrfProtection, adminController.showSetup2FA);
router.post('/setup-2fa', csrfProtection, adminController.setup2FA);
router.post('/enable-2fa', csrfProtection, [
  body('code').isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
], adminController.enable2FA);
router.post('/disable-2fa', csrfProtection, [
  body('code').isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
], adminController.disable2FA);

export default router;
