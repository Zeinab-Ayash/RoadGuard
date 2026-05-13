const supabase = require('../utils/dbConnection');
const Misbehavior = require('../models/Misbehavior');

async function createMisbehavior(req, res) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can record their own misbehaviors' });
  }

  const driverId = req.user.id;
  const { type_id, behavior_name, session_id } = req.body;

  if (!type_id && !behavior_name) {
    return res.status(400).json({ error: 'type_id or behavior_name is required' });
  }

  try {
    let typeId = type_id;
    if (!typeId) {
      const { data: type, error: typeError } = await supabase
        .from('misbehavior_type')
        .select('type_id')
        .eq('behavior_name', behavior_name)
        .single();
      if (typeError || !type) {
        return res.status(404).json({ error: `Unknown behavior_name: ${behavior_name}` });
      }
      typeId = type.type_id;
    }

    let sessionId = session_id;
    if (!sessionId) {
      const { data: activeSession } = await supabase
        .from('driving_session')
        .select('session_id')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        sessionId = activeSession.session_id;
      } else {
        const { data: newSession, error: sessError } = await supabase
          .from('driving_session')
          .insert({ driver_id: driverId, is_active: true })
          .select()
          .single();
        if (sessError) throw sessError;
        sessionId = newSession.session_id;
      }
    }

    const result = await Misbehavior.create({
      driver_id: driverId,
      session_id: sessionId,
      type_id: typeId,
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error('createMisbehavior error:', err);
    return res.status(500).json({ error: err.message || 'Failed to record misbehavior' });
  }
}

module.exports = { createMisbehavior };
