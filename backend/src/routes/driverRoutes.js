const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const {
  addDriver,
  loginDriver
} = require('../controllers/driverController');

router.post('/add', requireAuth, addDriver);
router.post('/login', loginDriver);

module.exports = router;