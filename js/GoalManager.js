// 目标管理器：目标库 + 今日承诺 + 推荐引擎
const { RECOMMENDED_GOALS } = require('../utils/constants');
const { getTodayString } = require('./utils/date');

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

  generateId() {
    return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  getTodayString() {
    return getTodayString();
  }

  _normalizeGoalName(name) {
    return String(name || '').trim();
  }

  _findReusableGoal(name) {
    const normalized = this._normalizeGoalName(name);
    if (!normalized) return null;
    return this.goals.find(g => !g.completed && g.name === normalized) || null;
  }

  createGoal({
    name,
    type,
    xp = null,
    baseXp = null,
    totalProgress = null,
    icon = '🎯',
    tag = '默认',
    createdFrom = 'recommended',
  }) {
    if (type === 'milestone' && (totalProgress === null || totalProgress <= 0)) {
      throw new Error('里程碑目标需要设置 totalProgress');
    }
    const normalizedName = this._normalizeGoalName(name).slice(0, 30);
    const existing = this._findReusableGoal(normalizedName);
    if (existing) return existing;

    const normalizedBaseXp = Math.min(30, Math.max(5, Number(baseXp != null ? baseXp : xp) || 15));
    const goal = {
      id: this.generateId(),
      name: normalizedName,
      type,
      xp: normalizedBaseXp,
      baseXp: normalizedBaseXp,
      icon: icon || '🎯',
      tag: tag || '默认',
      createdFrom,
      streakDays: 0,
      bestStreakDays: 0,
      lastCompletedDate: null,
      totalProgress: totalProgress || null,
      currentProgress: 0,
      createdAt: getTodayString(),
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

  _getStreakMultiplier(goal) {
    const streakDays = Number(goal && goal.streakDays) || 0;
    if (goal.type !== 'habit' && goal.createdFrom !== 'custom') return 1.0;
    if (streakDays >= 14) return 1.5;
    if (streakDays >= 7) return 1.35;
    if (streakDays >= 4) return 1.2;
    if (streakDays >= 2) return 1.1;
    return 1.0;
  }

  _getMoodMultiplier(moodValue) {
    const mood = Number(moodValue) || 0;
    if (mood >= 90) return 1.2;
    if (mood >= 80) return 1.1;
    if (mood >= 60) return 1.0;
    if (mood >= 40) return 0.95;
    return 0.85;
  }

  getGoalPreviewXp(goalId, moodValue) {
    const goal = typeof goalId === 'string' ? this.getGoalById(goalId) : goalId;
    if (!goal) return 0;
    const total = Math.round((goal.baseXp || goal.xp || 15) * this._getStreakMultiplier(goal) * this._getMoodMultiplier(moodValue));
    return Math.min(40, Math.max(0, total));
  }

  calculateGoalXp(goalId, moodValue, extraReward = 0) {
    const goal = typeof goalId === 'string' ? this.getGoalById(goalId) : goalId;
    if (!goal) {
      return {
        total: 0,
        baseXp: 0,
        streakBonus: 0,
        moodBonus: 0,
        extraReward: 0,
      };
    }
    const baseXp = goal.baseXp || goal.xp || 15;
    const streakAdjusted = Math.round(baseXp * this._getStreakMultiplier(goal));
    const moodAdjusted = Math.round(streakAdjusted * this._getMoodMultiplier(moodValue));
    const unclamped = moodAdjusted + extraReward;
    const total = Math.min(40, Math.max(0, unclamped));
    return {
      total,
      baseXp,
      streakBonus: Math.max(0, streakAdjusted - baseXp),
      moodBonus: Math.max(0, moodAdjusted - streakAdjusted),
      extraReward,
    };
  }

  applyGoalCompletion(goalId, { committedToday, completed, date }) {
    const goal = this.getGoalById(goalId);
    if (!goal) return null;
    if (!committedToday) return goal;

    if (completed) {
      goal.streakDays = (goal.streakDays || 0) + 1;
      goal.bestStreakDays = Math.max(goal.bestStreakDays || 0, goal.streakDays);
      goal.lastCompletedDate = date || getTodayString();
      goal.lastDoneAt = goal.lastCompletedDate;
    } else {
      goal.streakDays = 0;
    }
    return goal;
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
      this.applyGoalCompletion(goalId, {
        committedToday: true,
        completed: true,
        date: getTodayString(),
      });
      if (goal.type === 'milestone') {
        this.updateProgress(goalId, 1);
      }
      if (goal.type === 'oneTime') {
        goal.completed = true;
      }
    }
  }

  undoCompleteCommitment(goalId) {
    const commit = this.todayCommitments.find(c => c.goalId === goalId);
    if (!commit || !commit.completed) return false;
    commit.completed = false;
    const goal = this.getGoalById(goalId);
    if (goal) {
      goal.streakDays = Math.max(0, (goal.streakDays || 0) - 1);
      if (goal.type === 'milestone') {
        goal.currentProgress = Math.max(0, (goal.currentProgress || 0) - 1);
      }
      if (goal.type === 'oneTime') {
        goal.completed = false;
      }
      goal.lastDoneAt = null;
    }
    return true;
  }

  getRecommendations() {
    const shuffled = [...RECOMMENDED_GOALS].sort(() => Math.random() - 0.5);
    const count = 3 + Math.floor(Math.random() * 3);
    return shuffled.slice(0, count).map(g => {
      const baseXp = Math.min(30, Math.max(5, Number(g.baseXp != null ? g.baseXp : g.xp) || 15));
      return {
        ...g,
        id: this.generateId(),
        baseXp,
        xp: baseXp,
        icon: g.icon || '🎯',
        tag: g.tag || '默认',
        createdFrom: g.createdFrom || 'recommended',
      };
    });
  }

  checkDailyReset() {
    const today = getTodayString();
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
