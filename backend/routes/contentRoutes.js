const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authJWT');
const { getPageContent, updateContent, createContent } = require('../controllers/contentController');

router.get('/:page', authenticateJWT, getPageContent);
router.post('/:page', authenticateJWT, updateContent);
router.put('/:page', authenticateJWT, createContent);

module.exports = router;
