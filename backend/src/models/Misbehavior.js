const supabase = require('../utils/dbConnection');
const MonthlyScore = require('./MonthlyScore');

async function create({ driver_id, session_id, type_id }) {
  const { data: type, error: typeError } = await supabase
    .from('misbehavior_type')
    .select('severity_score, behavior_name')
    .eq('type_id', type_id)
    .single();
  if (typeError || !type) throw new Error('Misbehavior type not found');

  const { data: misbehavior, error: misError } = await supabase
    .from('misbehavior')
    .insert({ driver_id, session_id, type_id })
    .select()
    .single();
  if (misError) throw misError;

  const { error: notifError } = await supabase
    .from('notification')
    .insert({ driver_id, misbehavior_id: misbehavior.misbehavior_id });
  if (notifError) throw notifError;

  const newScore = await MonthlyScore.decrementCurrentMonth(driver_id, type.severity_score);

  return {
    misbehavior_id: misbehavior.misbehavior_id,
    behavior_name: type.behavior_name,
    severity_score: type.severity_score,
    new_score: newScore,
  };
}

module.exports = { create };
