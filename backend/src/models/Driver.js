const supabase = require('../utils/dbConnection');

const SAFE_DRIVER_FIELDS =
  'driver_id, driver_code, driver_name, phone, profile_image, current_score, created_at';

function startOfCurrentMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function findByCompany(companyId) {
  const { data: drivers, error: driversError } = await supabase
    .from('driver')
    .select(SAFE_DRIVER_FIELDS)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (driversError) throw driversError;
  if (drivers.length === 0) return [];

  const driverIds = drivers.map((d) => d.driver_id);
  const { data: misbehaviors, error: misError } = await supabase
    .from('misbehavior')
    .select('driver_id')
    .in('driver_id', driverIds)
    .gte('detected_at', startOfCurrentMonthISO());

  if (misError) throw misError;

  const countByDriver = {};
  for (const m of misbehaviors) {
    countByDriver[m.driver_id] = (countByDriver[m.driver_id] || 0) + 1;
  }

  return drivers.map((d) => ({
    ...d,
    current_month_misbehaviors: countByDriver[d.driver_id] || 0,
  }));
}

async function findById(driverId) {
  const { data, error } = await supabase
    .from('driver')
    .select(SAFE_DRIVER_FIELDS)
    .eq('driver_id', driverId)
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findByCompany, findById };
