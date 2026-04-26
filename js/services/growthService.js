function buildGrowthSnapshot(game) {
  const growth = game && game.growth ? game.growth : null;
  const goalManager = game && game.goalManager ? game.goalManager : null;
  const lulu = game && game.lulu ? game.lulu : null;
  const commitments = goalManager ? goalManager.getTodayCommitments() : [];
  const completedCount = commitments.filter((item) => item && item.completed).length;

  return {
    level: growth ? growth.level : 1,
    xp: growth ? growth.xp : 0,
    nextXp: growth && typeof growth.getXpForNextLevel === 'function' ? growth.getXpForNextLevel() : 100,
    progress: growth && typeof growth.getXpProgress === 'function' ? growth.getXpProgress() : 0,
    moodValue: lulu && typeof lulu.getMoodValue === 'function' ? lulu.getMoodValue() : 60,
    moodLabel: lulu && typeof lulu.getMoodLabel === 'function' ? lulu.getMoodLabel() : '平稳',
    commitmentCount: commitments.length,
    completedCount,
  };
}

module.exports = {
  buildGrowthSnapshot,
};
