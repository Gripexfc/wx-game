// 心愿单管理器：从目标库抽取每日心愿 + 心愿完成奖励
const { getTodayString } = require('./utils/date');
const { WISH_TEMPLATES } = require('../utils/constants');

class WishManager {
  constructor() {
    this.todayWishes = [];
    this.yesterdayUnfinished = null;
    this.lastResetDate = null;
    this._storage = null;
  }

  setStorage(storage) {
    this._storage = storage;
  }

  generateDailyWishes(goals) {
    if (!goals || goals.length === 0) return;

    const shuffled = [...goals].sort(() => Math.random() - 0.5);
    const count = 2 + Math.floor(Math.random() * 2);
    const selected = shuffled.slice(0, Math.min(count, goals.length));

    // 记录昨日未完成心愿
    const unfinished = this.todayWishes.filter(w => !w.completed);
    if (unfinished.length > 0) {
      const text = unfinished[0].wishText;
      this.yesterdayUnfinished = `昨天的「${text}」还没完成，今天补上也算数哦`;
    } else {
      this.yesterdayUnfinished = null;
    }

    this.todayWishes = selected.map(goal => ({
      id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      goalId: goal.id,
      wishText: this._buildWishText(goal),
      xp: goal.xp,
      extraMoodBoost: 7,
      completed: false,
    }));
    this.lastResetDate = getTodayString();
  }

  _buildWishText(goal) {
    const templates = WISH_TEMPLATES[goal.tag] || WISH_TEMPLATES.default;
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace('{goal}', goal.name);
  }

  getTodayWishes() {
    return this.todayWishes.filter(w => !w.completed);
  }

  getCompletedWishes() {
    return this.todayWishes.filter(w => w.completed);
  }

  completeWish(wishId) {
    const wish = this.todayWishes.find(w => w.id === wishId);
    if (!wish || wish.completed) return null;
    wish.completed = true;

    return {
      xp: wish.xp + 5,
      moodBoost: 15 + wish.extraMoodBoost,
      loveStar: 1,
      goalId: wish.goalId,
      goalCompleted: false,
    };
  }

  getUnfinishedYesterday() {
    return this.yesterdayUnfinished;
  }

  checkDailyReset() {
    const today = getTodayString();
    if (this.lastResetDate !== today) {
      this.todayWishes = [];
      this.yesterdayUnfinished = null;
      this.lastResetDate = today;
    }
  }

  serialize() {
    return {
      todayWishes: this.todayWishes,
      yesterdayUnfinished: this.yesterdayUnfinished,
      lastResetDate: this.lastResetDate,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.todayWishes = data.todayWishes || [];
    this.yesterdayUnfinished = data.yesterdayUnfinished;
    this.lastResetDate = data.lastResetDate;
  }
}

module.exports = WishManager;
