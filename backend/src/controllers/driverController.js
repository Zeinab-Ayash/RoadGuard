const Driver = require('../models/Driver');

async function list(req, res) {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can list drivers' });
  }

  try {
    const drivers = await Driver.findByCompany(req.user.id);
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list };
