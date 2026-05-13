const express = require('express');
const multer = require('multer');

const { requireAuth } = require('../middleware/authMiddleware');
const {
  addDriver,
  loginDriver,
  list,
  deactivateDriver,
  updateMe,
} = require('../controllers/driverController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/', requireAuth, list);
router.post('/add', requireAuth, addDriver);
router.post('/login', loginDriver);
router.patch('/me', requireAuth, upload.single('photo'), updateMe);
router.patch('/deactivate/:id', requireAuth, deactivateDriver);

module.exports = router;
