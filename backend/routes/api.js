// routes/api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { handleContact } = require('../controllers/contactController');
const csrf = require('csurf');

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({ storage });

// CSRF middleware applied in server.js globally or per route; here assume global cookie-based token exists
router.post('/contact', upload.single('file'), handleContact);

module.exports = router;
