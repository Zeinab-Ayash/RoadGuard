const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { me } = require('../controllers/authController');

const router = express.Router();

router.get('/me', requireAuth, me);

module.exports = router;
