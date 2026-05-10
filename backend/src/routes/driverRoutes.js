const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const {
  addDriver,
  loginDriver,
  deactivateDriver
} = require('../controllers/driverController');


router.post('/add', requireAuth, addDriver);
router.post('/login', loginDriver);
router.patch(
  "/driver/deactivate/:id",
  requireAuth,
  deactivateDriver
);

module.exports = router;