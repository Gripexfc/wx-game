// tests/main-stub.js
// 简化 Game 类测试桩（只包含 completeGoal 核心逻辑）
const Storage = require('../js/Storage');
const GoalManager = require('../js/GoalManager');
const WishManager = require('../js/WishManager');
const GrowthSystem = require('../js/GrowthSystem');

class GameTestStub {
  constructor(options = {}) {
    this.storage = new Storage();
    this.goalManager = new GoalManager();
    this.wishManager = new WishManager();
    this.growth = new GrowthSystem();
    this.petStateManager = {
      moodValue: options.moodValue != null ? options.moodValue : 68,
      adjustMood: () => {},
    };
    this.goalManager.setStorage(this.storage);
    this.wishManager.setStorage(this.storage);
  }
  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }
  completeGoal(goalId) {
    const commitments = this.goalManager.getTodayCommitments();
    const commit = commitments.find(c => c.goalId === goalId);
    if (!commit || commit.completed) return;
    const goal = this.goalManager.getGoalById(goalId);
    const wish = this.wishManager.getTodayWishes().find(w => w.goalId === goalId);
    const extraReward = wish ? 5 : 0;
    const xpBreakdown = this.goalManager.calculateGoalXp(goalId, this.petStateManager.moodValue, extraReward);

    this.goalManager.completeCommitment(goalId);
    let wishReward = null;
    if (wish) {
      wishReward = this.wishManager.completeWish(wish.id);
    }
    this.growth.addXp(xpBreakdown.total);
    return {
      wishReward,
      goal,
      xpAwarded: xpBreakdown.total,
      xpBreakdown,
    };
  }
}
module.exports = { GameTestStub };
