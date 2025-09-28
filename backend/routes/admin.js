// routes/admin.js
import express from 'express';
import csrf from 'csurf';
import multer from 'multer';
import path from 'path';
import adminCtrl from '../controllers/adminController.js';
import { ensureAdmin } from '../middleware/auth.js';
import Contact from '../models/Contact.js'; // Glöm inte att importera modellen

const router = express.Router();

// CSRF
const csrfProtection = csrf({ cookie: true });

// Multer storage för filuppladdningar
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => Date.now() + '-' + file.originalname
});
const upload = multer({ storage });

// --- Login / Logout ---
router.get('/login', csrfProtection, adminCtrl.showLogin);
router.post('/login', csrfProtection, adminCtrl.doLogin);
router.get('/logout', adminCtrl.logout);

// --- Dashboard ---
router.get('/', ensureAdmin, adminCtrl.dashboard);

// --- Kontakter ---
router.get('/contacts', ensureAdmin, csrfProtection, adminCtrl.listContacts);

// DELETE route för AJAX
router.delete('/contacts/delete/:id', ensureAdmin, csrfProtection, async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.json({ success: false, message: 'Kontakten finns inte.' });

    await contact.destroy();
    res.json({ success: true, message: 'Kontakten raderades.' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Fel vid radering.' });
  }
});

// --- Redigera sidor ---
router.get('/pages/:slug?', ensureAdmin, adminCtrl.showEditPage);
router.post('/pages/:slug?', ensureAdmin, upload.single('image'), adminCtrl.savePage);

export default router;
