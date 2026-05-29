const DrivingSession = require('../models/DrivingSession');

// Public read-only endpoint used by the AI server's browser publisher
// (publish.html) to auto-pair when a driving session starts. Polled
// every 2 seconds. Returns the session_id of the most recent active
// session globally, or null if none is active.
async function getLatestAnyActive(req, res) {
  try {
    const session = await DrivingSession.getLatestAnyActive();
    return res.json({ session_id: session ? session.session_id : null });
  } catch (err) {
    console.error('getLatestAnyActive error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { getLatestAnyActive };
