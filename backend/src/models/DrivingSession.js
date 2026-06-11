const supabase = require('../utils/dbConnection');

async function start(driverId) {
  const { data, error } = await supabase
    .from('driving_session')
    .insert({ driver_id: driverId, is_active: true })
    .select('session_id, driver_id, start_time, is_active')
    .single();
  if (error) throw error;
  return data;
}

async function endSession(sessionId, driverId) {
  const { data: existing, error: fetchError } = await supabase
    .from('driving_session')
    .select('session_id, driver_id, is_active')
    .eq('session_id', sessionId)
    .single();
  if (fetchError || !existing) {
    const err = new Error('Session not found');
    err.status = 404;
    throw err;
  }
  if (existing.driver_id !== driverId) {
    const err = new Error('You do not own this session');
    err.status = 403;
    throw err;
  }
  if (!existing.is_active) {
    const err = new Error('Session already ended');
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from('driving_session')
    .update({ end_time: new Date().toISOString(), is_active: false })
    .eq('session_id', sessionId)
    .select('session_id, driver_id, start_time, end_time, is_active')
    .single();
  if (error) throw error;
  return data;
}

async function getActive(driverId) {
  const { data } = await supabase
    .from('driving_session')
    .select('session_id, start_time')
    .eq('driver_id', driverId)
    .eq('is_active', true)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

// Returns the most recently started active session, regardless of which driver.
// Used by the AI server's browser publisher to auto-pair (it has no login
// context, so it cannot query by driver_id). For the classroom demo where
// only one driver is active at a time, this is unambiguous.
async function getLatestAnyActive() {
  const { data } = await supabase
    .from('driving_session')
    .select('session_id, driver_id, start_time')
    .eq('is_active', true)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

module.exports = { start, endSession, getActive, getLatestAnyActive };
