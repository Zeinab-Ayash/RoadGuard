const express = require('express');

const { requireAuth } = require('../middleware/authMiddleware');
const {
  addDriver,
  loginDriver,
  list,
  deactivateDriver
} = require('../controllers/driverController');

const router = express.Router();

router.get('/', requireAuth, list);
router.post('/add', requireAuth, addDriver);
router.post('/login', loginDriver);
router.patch('/driver/deactivate/:id', requireAuth, deactivateDriver);

module.exports = router;