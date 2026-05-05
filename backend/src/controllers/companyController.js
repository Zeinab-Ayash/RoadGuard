const path = require('path');
const Company = require('../models/Company');
const { uploadImage } = require('../utils/storage');

async function updateMe(req, res) {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can update their own profile' });
  }

  try {
    const updates = {};

    if (req.file) {
      const ext = (path.extname(req.file.originalname) || '.jpg').toLowerCase();
      const filename = `${req.user.id}-${Date.now()}${ext}`;
      const url = await uploadImage({
        bucket: 'company-logos',
        path: filename,
        file: req.file.buffer,
        contentType: req.file.mimetype,
      });
      updates.logo_path = url;
    }

    if (req.body.company_name) updates.company_name = req.body.company_name;
    if (req.body.phone) updates.phone = req.body.phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await Company.update(req.user.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { updateMe };
