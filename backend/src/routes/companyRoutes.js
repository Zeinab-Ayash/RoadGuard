const express = require('express');
const router = express.Router();

const {
  signupCompany,
  loginCompany,
  getCompanyProfile
} = require('../controllers/companyController');

const { requireAuth } = require('../middleware/authMiddleware');

// 🏢 Signup
router.post('/signup', signupCompany);

// 🔐 Login
router.post('/login', loginCompany);

// 👤 Profile (protected)
router.get('/me', requireAuth, getCompanyProfile);

module.exports = router;