const supabase = require('../utils/dbConnection');

class DrivingSession {
  // Find an active session for a specific driver
  static async getActive(driverId) {
    const { data, error } = await supabase
      .from('driving_session')
      .select('*')
      .eq('driver_id', driverId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  // Insert a new active session
  static async start(driverId) {
    const { data, error } = await supabase
      .from('driving_session')
      .insert({
        driver_id: driverId,
        is_active: true,
        start_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // End an active session
  static async endSession(sessionId, driverId) {
    const { data, error } = await supabase
      .from('driving_session')
      .update({ is_active: false, end_time: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('driver_id', driverId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
static async getActive(driverId) {
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
static async getLatestAnyActive() {
    const { data, error } = await supabase
      .from('driving_session')
      .select('session_id')
      .eq('is_active', true)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
module.exports = DrivingSession;

