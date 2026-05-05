const Notification = require('../models/Notification');

async function list(req, res) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can view their notifications' });
  }
  try {
    const notifications = await Notification.findCurrentMonthByDriver(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function markRead(req, res) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can mark their notifications' });
  }
  try {
    const updated = await Notification.markAsRead(req.params.id, req.user.id);
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, markRead };
