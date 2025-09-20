// routes/admin.js
const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const { ensureAdmin } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => Date.now() + '-' + file.originalname
});
const upload = multer({ storage });

router.get('/login', adminCtrl.showLogin);
router.post('/login', adminCtrl.doLogin);
router.get('/logout', adminCtrl.logout);

router.get('/', ensureAdmin, adminCtrl.dashboard);
router.get('/contacts', ensureAdmin, adminCtrl.listContacts);

router.get('/pages/:slug?', ensureAdmin, adminCtrl.showEditPage);
router.post('/pages/:slug?', ensureAdmin, upload.single('image'), adminCtrl.savePage);

module.exports = router;
