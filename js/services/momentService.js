function createCompletionMoment(goal, visualFx) {
  if (!goal) return null;
  const xp = visualFx && Number.isFinite(visualFx.xp) ? visualFx.xp : 0;
  const moodBoost = visualFx && Number.isFinite(visualFx.moodBoost) ? visualFx.moodBoost : 0;

  return {
    goalId: goal.id,
    goalName: goal.name || '今日目标',
    summary: `完成 ${goal.name || '目标'}，获得 +${xp}XP`,
    moodSummary: moodBoost > 0 ? `心情 +${moodBoost}` : '',
    createdAt: Date.now(),
  };
}

module.exports = {
  createCompletionMoment,
};
