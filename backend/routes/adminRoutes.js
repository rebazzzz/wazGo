const express = require('express');
const router = express.Router();
const { loginAdmin, getContacts } = require('../controllers/adminController');
const { authenticateJWT } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);
router.get('/contacts', authenticateJWT, getContacts);

module.exports = router;
