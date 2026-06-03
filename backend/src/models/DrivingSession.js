const supabase = require('../utils/dbConnection');

class DrivingSession {
  // 1. Find an active session for a specific driver (Fixed & Kept clean fallback sorting)
  static async getActive(driverId) {
    const { data, error } = await supabase
      .from('driving_session')
      .select('*') // Keeps all columns intact so your controller doesn't break
      .eq('driver_id', driverId)
      .eq('is_active', true)
      .order('start_time', { ascending: false }) // Fallback safety sorting
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data || null;
  }

  // 2. Insert a new active session
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

  // 3. End an active session
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

  // 4. Classroom Demo Unambiguous Auto-Pairing Fallback Link
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