const express = require('express');
const { getLatestAnyActive } = require('../controllers/sessionsController');

// Intentionally NO auth on this route. The AI server's browser publisher
// has no login context. See sessionsController.js for the demo-context
// rationale and the future-work note in ai/server/API_CONTRACT.md §9.
const router = express.Router();

router.get('/active', getLatestAnyActive);

module.exports = router;
