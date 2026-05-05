const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const { updateMe } = require('../controllers/companyController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.patch('/me', requireAuth, upload.single('logo'), updateMe);

module.exports = router;
