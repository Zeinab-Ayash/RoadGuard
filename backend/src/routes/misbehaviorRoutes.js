const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { createMisbehavior } = require('../controllers/misbehaviorController');

const router = express.Router();

router.post('/', requireAuth, createMisbehavior);

module.exports = router;
