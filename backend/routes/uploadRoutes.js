const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateJWT } = require('../middleware/authJWT');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

router.post('/', authenticateJWT, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Ingen fil uppladdad' });

    res.json({
        message: 'Fil uppladdad',
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
    });
});

module.exports = router;
