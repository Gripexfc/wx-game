// js/__tests__/main-stub.js
// 简化 Game 类测试桩（只包含 completeGoal 核心逻辑）
const Storage = require('../Storage');
const GoalManager = require('../GoalManager');
const WishManager = require('../WishManager');

class GameTestStub {
  constructor() {
    this.storage = new Storage();
    this.goalManager = new GoalManager();
    this.wishManager = new WishManager();
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
    this.goalManager.completeCommitment(goalId);
    const wish = this.wishManager.getTodayWishes().find(w => w.goalId === goalId);
    let wishReward = null;
    if (wish) {
      wishReward = this.wishManager.completeWish(wish.id);
    }
    const goal = this.goalManager.getGoalById(wishReward?.goalId);
    if (goal && goal.type === 'oneTime') {
      goal.completed = true;
    }
    return { wishReward, goal };
  }
}
module.exports = { GameTestStub };
