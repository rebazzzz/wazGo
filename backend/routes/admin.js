// routes/admin.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import csrf from 'csurf';
import auth from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

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
const upload = multer({ storage });

// Login
router.get('/login', csrfProtection, adminController.showLogin);
router.post('/login', csrfProtection, adminController.doLogin);

// Protected routes
router.use(auth);

// Dashboard
router.get('/dashboard', csrfProtection, adminController.showDashboard);

// Contacts
router.get('/contacts', csrfProtection, adminController.showContacts);
router.post('/contacts/delete', csrfProtection, adminController.deleteContact);

// Pages
router.get('/edit/:id', csrfProtection, adminController.showEditPage);
router.post('/edit/:id', csrfProtection, adminController.updatePage);

// Upload
router.post('/upload', upload.single('image'), adminController.uploadImage);

// Logout
router.get('/logout', adminController.logout);

export default router;
