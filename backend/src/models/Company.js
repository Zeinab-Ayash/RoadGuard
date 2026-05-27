const supabase = require('../utils/dbConnection');

const SAFE_COMPANY_FIELDS =
  'company_id, company_name, email, phone, logo_path, created_at';

async function findById(companyId) {
  const { data, error } = await supabase
    .from('company')
    .select(SAFE_COMPANY_FIELDS)
    .eq('company_id', companyId)
    .single();

  if (error) throw error;
  return data;
}

async function update(companyId, fields) {
  const { data, error } = await supabase
    .from('company')
    .update(fields)
    .eq('company_id', companyId)
    .select(SAFE_COMPANY_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findById, update };
