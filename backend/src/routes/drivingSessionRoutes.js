const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  startSession,
  endSession,
  getActiveSession,
} = require('../controllers/drivingSessionController');

const router = express.Router();

router.post('/', requireAuth, startSession);
router.patch('/:id/end', requireAuth, endSession);
router.get('/active', requireAuth, getActiveSession);

module.exports = router;
