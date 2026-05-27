const DrivingSession = require('../models/DrivingSession');

async function startSession(req, res) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can start a session' });
  }

  try {
    const existing = await DrivingSession.getActive(req.user.id);
    if (existing) {
      return res.status(200).json(existing);
    }
    const session = await DrivingSession.start(req.user.id);
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
    return res.json(session);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
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
