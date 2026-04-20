// 目标管理器：目标库 + 今日承诺 + 推荐引擎
const { RECOMMENDED_GOALS } = require('../utils/constants');

class GoalManager {
  constructor() {
    this.goals = [];
    this.todayCommitments = [];
    this.lastResetDate = null;
    this._storage = null;
  }

  setStorage(storage) {
    this._storage = storage;
  }

  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  generateId() {
    return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  createGoal({ name, type, xp = 15, totalProgress = null }) {
    if (type === 'milestone' && (totalProgress === null || totalProgress <= 0)) {
      throw new Error('里程碑目标需要设置 totalProgress');
    }
    const goal = {
      id: this.generateId(),
      name: String(name).trim().slice(0, 30),
      type,
      xp: Math.min(30, Math.max(5, Number(xp) || 15)),
      totalProgress: totalProgress || null,
      currentProgress: 0,
      createdAt: this.getTodayString(),
      lastDoneAt: null,
      remindCount: 0,
      completed: false,
    };
    this.goals.push(goal);
    return goal;
  }

  getGoals() {
    return this.goals.filter(g => !g.completed);
  }

  getGoalById(id) {
    return this.goals.find(g => g.id === id);
  }

  updateProgress(goalId, delta) {
    const goal = this.getGoalById(goalId);
    if (!goal || goal.type !== 'milestone') return;
    goal.currentProgress = Math.min(goal.currentProgress + delta, goal.totalProgress);
    if (goal.currentProgress >= goal.totalProgress) {
      goal.currentProgress = goal.totalProgress;
      goal.completed = true;
    }
  }

  deleteGoal(goalId) {
    this.goals = this.goals.filter(g => g.id !== goalId);
    this.todayCommitments = this.todayCommitments.filter(c => c.goalId !== goalId);
  }

  commitGoal(goalId) {
    if (this.todayCommitments.length >= 4) {
      throw new Error('今日承诺最多4个');
    }
    if (this.todayCommitments.find(c => c.goalId === goalId)) {
      throw new Error('该目标已在今日承诺中');
    }
    this.todayCommitments.push({ goalId, completed: false });
  }

  uncommitGoal(goalId) {
    this.todayCommitments = this.todayCommitments.filter(c => c.goalId !== goalId);
  }

  getTodayCommitments() {
    return this.todayCommitments
      .map(c => {
        const goal = this.getGoalById(c.goalId);
        return { ...c, goal };
      })
      .filter(c => c.goal);
  }

  completeCommitment(goalId) {
    const commit = this.todayCommitments.find(c => c.goalId === goalId);
    if (!commit) return;
    commit.completed = true;
    const goal = this.getGoalById(goalId);
    if (goal) {
      goal.lastDoneAt = this.getTodayString();
      if (goal.type === 'milestone') {
        this.updateProgress(goalId, 1);
      }
      if (goal.type === 'oneTime') {
        goal.completed = true;
      }
    }
  }

  getRecommendations() {
    const shuffled = [...RECOMMENDED_GOALS].sort(() => Math.random() - 0.5);
    const count = 3 + Math.floor(Math.random() * 3);
    return shuffled.slice(0, count).map(g => ({ ...g, id: this.generateId() }));
  }

  checkDailyReset() {
    const today = this.getTodayString();
    if (this.lastResetDate !== today) {
      this.todayCommitments = [];
      this.lastResetDate = today;
    }
  }

  serialize() {
    return {
      goals: this.goals,
      todayCommitments: this.todayCommitments,
      lastResetDate: this.lastResetDate,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.goals = data.goals || [];
    this.todayCommitments = data.todayCommitments || [];
    this.lastResetDate = data.lastResetDate;
  }
}

module.exports = GoalManager;
