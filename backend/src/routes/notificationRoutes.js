const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { list, markRead } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', requireAuth, list);
router.patch('/:id/read', requireAuth, markRead);

module.exports = router;
