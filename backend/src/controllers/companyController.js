const path = require('path');
const bcrypt = require('bcrypt');
const supabase = require('../utils/dbConnection');
const { signToken } = require('../utils/jwt');
const Company = require('../models/Company');
const { uploadImage } = require('../utils/storage');


// ============================
// 🏢 SIGNUP COMPANY
// ============================
exports.signupCompany = async (req, res) => {
  try {
    const { company_name, email, password, phone, logo_path } = req.body;

    const { data: existing } = await supabase
      .from('company')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('company')
      .insert([
        {
          company_name,
          email,
          password: password_hash,
          phone,
          logo_path: logo_path || null
        }
      ])
      .select()
      .single();

    if (error) { return res.status(400).json({ error: error.message }); }

    const token = signToken({
      id: data.company_id,
      role: 'company'
    });

    res.status(201).json({
      message: 'Company created successfully',
      token,
      role: 'company',
      user: {
        company_id: data.company_id,
        company_name: data.company_name,
        email: data.email,
        phone: data.phone,
        logo_path: data.logo_path
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ============================
// 🔐 LOGIN COMPANY
// ============================
exports.loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: company } = await supabase
      .from('company')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!company) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, company.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = signToken({
      id: company.company_id,
      role: 'company'
    });

    res.json({
      message: 'Login successful',
      token,
      role: 'company',
      user: {
        company_id: company.company_id,
        company_name: company.company_name,
        email: company.email,
        phone: company.phone,
        logo_path: company.logo_path
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ============================
// 👤 GET COMPANY PROFILE
// ============================
exports.getCompanyProfile = async (req, res) => {
  try {
    const companyId = req.user.id;

    const { data, error } = await supabase
      .from('company')
      .select('company_id, company_name, email, phone, logo_path, created_at')
      .eq('company_id', companyId)
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ company: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ============================
// ✏️ UPDATE COMPANY PROFILE
// ============================
exports.updateMe = async (req, res) => {
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
};