const supabase = require('../utils/dbConnection');

async function decrementCurrentMonth(driverId, points) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: existing } = await supabase
    .from('monthly_score')
    .select('score')
    .eq('driver_id', driverId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  let newScore;
  if (!existing) {
    newScore = Math.max(0, 100 - points);
    const { error } = await supabase
      .from('monthly_score')
      .insert({ driver_id: driverId, year, month, score: newScore });
    if (error) throw error;
  } else {
    newScore = Math.max(0, existing.score - points);
    const { error } = await supabase
      .from('monthly_score')
      .update({ score: newScore })
      .eq('driver_id', driverId)
      .eq('year', year)
      .eq('month', month);
    if (error) throw error;
  }

  const { error: driverError } = await supabase
    .from('driver')
    .update({ current_score: newScore })
    .eq('driver_id', driverId);
  if (driverError) throw driverError;

  return newScore;
}

module.exports = { decrementCurrentMonth };
