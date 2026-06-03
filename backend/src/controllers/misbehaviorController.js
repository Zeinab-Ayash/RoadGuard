const supabase = require('../utils/dbConnection');
const Misbehavior = require('../models/Misbehavior');

async function createMisbehavior(req, res) {
  // Allow authorized drivers or the laptop's python background agent process
  let driverId = req.user ? req.user.id : null;
  const { type_id, behavior_name, session_id } = req.body;

  try {
    let targetSessionId = session_id;
    let targetDriverId = driverId;

    // If an external daemon sends an alarm, look up who owns that session
    if (!targetDriverId && targetSessionId) {
      const { data: sessData } = await supabase
        .from('driving_session')
        .select('driver_id')
        .eq('session_id', targetSessionId)
        .single();
      if (sessData) {
        targetDriverId = sessData.driver_id;
      }
    }

    // Fallback error containment if parameters are missing
    if (!targetDriverId) {
      return res.status(400).json({ error: 'Driver identity tracking context is required.' });
    }

    // Resolve type_id from behavior string name
    let typeId = type_id;
    if (!typeId && behavior_name) {
      const { data: type } = await supabase
        .from('misbehavior_type')
        .select('type_id')
        .eq('behavior_name', behavior_name)
        .single();
      if (!type) return res.status(404).json({ error: `Unknown behavior: ${behavior_name}` });
      typeId = type.type_id;
    }

    // Commit Misbehavior Entry to Database
    const result = await Misbehavior.create({
      driver_id: targetDriverId,
      session_id: targetSessionId,
      type_id: typeId,
    });

    // --- AUTO-INTEGRATION STEP TO MOBILE NOTIFICATION CARD ---
    // Push an unread entry straight into the notification log table
    await supabase
      .from('notification')
      .insert({
        driver_id: targetDriverId,
        behavior_name: behavior_name || 'Safety Alert',
        is_read: false,
        created_at: new Date().toISOString()
      });

    return res.status(201).json(result);
  } catch (err) {
    console.error('createMisbehavior error:', err);
    return res.status(500).json({ error: err.message || 'Failed to record pipeline log' });
  }
}

module.exports = { createMisbehavior };