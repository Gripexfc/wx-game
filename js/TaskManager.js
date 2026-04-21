const { TASKS } = require('../utils/constants');
const { getTodayString } = require('./utils/date');

const PLACEHOLDER_ID = '__daily_placeholder__';
const DAILY_CUSTOM_ID = 'daily_custom';

class TaskManager {
  constructor() {
    this._TASKS = TASKS;
    this.todayTasks = {
      fitness: false,
      eat: false,
      read: false,
      sleep: false,
    };
    /** 每日仅一条自定义：不修改则跨天沿用文案，仅重置完成态 */
    this.dailyCustom = null;
    this.lastResetDate = null;
  }

  /** 返回任务当前完成状态（内部使用） */
  _getTaskCompleted(taskId) {
    if (taskId === PLACEHOLDER_ID) return false;
    if (this.todayTasks.hasOwnProperty(taskId)) {
      return !!this.todayTasks[taskId];
    }
    if (this.dailyCustom && this.dailyCustom.id === taskId) {
      return !!this.dailyCustom.completed;
    }
    return false;
  }

  /** 切换任务完成状态，返回 { completed, xpDelta }
   *  completed: 切换后的完成状态
   *  xpDelta: XP 变化量（正=获得，负=扣除）
   */
  toggleTask(taskId) {
    if (taskId === PLACEHOLDER_ID) return { completed: false, xpDelta: 0 };

    if (this.todayTasks.hasOwnProperty(taskId)) {
      const wasCompleted = !!this.todayTasks[taskId];
      this.todayTasks[taskId] = !wasCompleted;
      const taskDef = Object.values(this._TASKS).find(t => t.id === taskId);
      const xp = taskDef ? taskDef.xp : 0;
      return { completed: !wasCompleted, xpDelta: wasCompleted ? -xp : xp };
    }

    if (this.dailyCustom && this.dailyCustom.id === taskId) {
      const wasCompleted = !!this.dailyCustom.completed;
      this.dailyCustom.completed = !wasCompleted;
      const xp = this.dailyCustom.xp || 0;
      return { completed: !wasCompleted, xpDelta: wasCompleted ? -xp : xp };
    }

    return { completed: false, xpDelta: 0 };
  }

  checkDailyReset() {
    const today = getTodayString();
    if (this.lastResetDate !== today) {
      this.resetDaily();
      this.lastResetDate = today;
    }
  }

  resetDaily() {
    this.todayTasks = {
      fitness: false,
      eat: false,
      read: false,
      sleep: false,
    };
    if (this.dailyCustom) {
      this.dailyCustom.completed = false;
    }
  }

  /** 设置 / 覆盖今日小目标（每天可改；存档里会记住文案） */
  setDailyCustom({ name, desc = '', xp = 12, icon = '✨' }) {
    const n = String(name || '').trim();
    if (!n) return false;
    this.dailyCustom = {
      id: DAILY_CUSTOM_ID,
      name: n.slice(0, 18),
      desc: String(desc || '').trim().slice(0, 28),
      xp: Math.min(30, Math.max(5, Number(xp) || 12)),
      icon: icon || '✨',
      completed: false,
    };
    return true;
  }

  getDailyCustom() {
    return this.dailyCustom;
  }

  getTodayTasks() {
    const tasks = [];
    Object.values(TASKS).forEach((task) => {
      tasks.push({
        id: task.id,
        name: task.name,
        icon: task.icon,
        xp: task.xp,
        desc: task.desc,
        completed: this.todayTasks[task.id] || false,
        isCustom: false,
      });
    });

    if (this.dailyCustom && this.dailyCustom.name) {
      tasks.push({
        ...this.dailyCustom,
        isCustom: true,
      });
    } else {
      tasks.push({
        id: PLACEHOLDER_ID,
        name: '我的小目标',
        desc: '点一下写一句 · 不改就沿用昨天',
        icon: '✏️',
        xp: 0,
        completed: false,
        isPlaceholder: true,
      });
    }

    return tasks;
  }

  getTotalXp() {
    let xp = 0;
    Object.values(TASKS).forEach((t) => {
      if (this.todayTasks[t.id]) xp += t.xp;
    });
    if (this.dailyCustom && this.dailyCustom.completed) {
      xp += this.dailyCustom.xp || 0;
    }
    return xp;
  }

  serialize() {
    return {
      todayTasks: this.todayTasks,
      dailyCustom: this.dailyCustom,
      lastResetDate: this.lastResetDate,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.todayTasks = data.todayTasks || this.todayTasks;
    this.lastResetDate = data.lastResetDate;
    if (data.dailyCustom) {
      this.dailyCustom = data.dailyCustom;
    } else if (Array.isArray(data.customTasks) && data.customTasks.length) {
      const t = data.customTasks[0];
      this.dailyCustom = {
        id: DAILY_CUSTOM_ID,
        name: t.name || '小目标',
        desc: t.desc || '',
        xp: t.xp || 12,
        icon: t.icon || '✨',
        completed: !!t.completed,
      };
    }
  }

  /** 兼容旧 TaskPage：写入即覆盖当日唯一自定义 */
  addCustomTask(task) {
    if (task && task.name) {
      this.setDailyCustom({
        name: task.name,
        desc: task.desc,
        xp: task.xp,
        icon: task.icon,
      });
    }
  }
}

module.exports = TaskManager;
module.exports.PLACEHOLDER_ID = PLACEHOLDER_ID;
module.exports.DAILY_CUSTOM_ID = DAILY_CUSTOM_ID;
