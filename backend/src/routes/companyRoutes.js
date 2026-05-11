const express = require('express');
const multer = require('multer');

const {
  signupCompany,
  loginCompany,
  getCompanyProfile,
  updateMe
} = require('../controllers/companyController');

const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// 🏢 Signup
router.post('/signup', signupCompany);

// 🔐 Login
router.post('/login', loginCompany);

// 👤 Profile (protected)
router.get('/me', requireAuth, getCompanyProfile);

// ✏️ Update profile + logo upload
router.patch('/me', requireAuth, upload.single('logo'), updateMe);

module.exports = router;