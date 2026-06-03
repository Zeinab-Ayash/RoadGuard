const supabase = require('../utils/dbConnection');

function startOfCurrentMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
async function findCurrentMonthByDriver(driverId) {
  // FIXED: Changed selection schema to read the direct 'behavior_name' column string you insert
  const { data, error } = await supabase
    .from('notification')
    .select(`
      notification_id,
      is_read,
      created_at,
      behavior_name
    `)
    .eq('driver_id', driverId)
    .gte('created_at', startOfCurrentMonthISO())
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map the results cleanly so they match your exact React Native frontend expectation fields
  return data.map((n) => ({
    notification_id: n.notification_id,
    is_read: n.is_read,
    created_at: n.created_at,
    behavior_name: n.behavior_name || 'Safety Alert', // Safe fallback string text
  }));
}

async function markAsRead(notificationId, driverId) {
  const { data, error } = await supabase
    .from('notification')
    .update({ is_read: true })
    .eq('notification_id', notificationId)
    .eq('driver_id', driverId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = { findCurrentMonthByDriver, markAsRead };
