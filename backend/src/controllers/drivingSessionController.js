const DrivingSession = require('../models/DrivingSession');

async function startSession(req, res) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can start a session' });
  }

  try {
    let session = await DrivingSession.getActive(req.user.id);
    if (!session) {
      session = await DrivingSession.start(req.user.id);
    }

    // BROADCAST REALTIME SIGNAL INSTANTLY TO LAPTOP
    if (req.io) {
      req.io.emit('SESSION_STARTED', { session_id: session.session_id });
    }

    return res.status(201).json(session);
  } catch (err) {
    console.error('startSession error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function endSession(req, res) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can end a session' });
  }

  try {
    const session = await DrivingSession.endSession(req.params.id, req.user.id);

    // CLOSE THE LAPTOP WEBCAM FEED INSTANTLY
    if (req.io) {
      req.io.emit('SESSION_ENDED', { session_id: req.params.id });
    }

    return res.json(session);
  } catch (err) {
    console.error('endSession error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function getActiveSession(req, res) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can check their own session' });
  }
  try {
    const session = await DrivingSession.getActive(req.user.id);
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { startSession, endSession, getActiveSession };