const { TASKS } = require('../utils/constants');

class TaskManager {
  constructor() {
    this.todayTasks = {
      fitness: false,
      eat: false,
      read: false,
      sleep: false,
    };
    this.customTasks = [];
    this.lastResetDate = null;
  }

  // 检查是否需要重置每日任务
  checkDailyReset() {
    const today = this.getTodayString();
    if (this.lastResetDate !== today) {
      this.resetDaily();
      this.lastResetDate = today;
    }
  }

  // 获取今日日期字符串
  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  // 重置每日任务
  resetDaily() {
    this.todayTasks = {
      fitness: false,
      eat: false,
      read: false,
      sleep: false,
    };
    // 自选任务保留
  }

  // 完成任务
  completeTask(taskId) {
    if (this.todayTasks.hasOwnProperty(taskId)) {
      this.todayTasks[taskId] = true;
      return true;
    }
    const customIndex = this.customTasks.findIndex(t => t.id === taskId);
    if (customIndex !== -1) {
      this.customTasks[customIndex].completed = true;
      return true;
    }
    return false;
  }

  // 获取今日任务列表
  getTodayTasks() {
    const tasks = [];

    // 固定任务
    for (const [id, task] of Object.entries(TASKS)) {
      tasks.push({
        id,
        name: task.name,
        icon: task.icon,
        xp: task.xp,
        desc: task.desc,
        completed: this.todayTasks[id] || false,
        isCustom: false,
      });
    }

    // 自选任务
    for (const task of this.customTasks) {
      tasks.push({
        id: task.id,
        name: task.name,
        icon: task.icon || '✨',
        xp: task.xp || 10,
        desc: task.desc || '',
        completed: task.completed || false,
        isCustom: true,
      });
    }

    return tasks;
  }

  // 获取已完成任务数
  getCompletedCount() {
    let count = 0;
    for (const completed of Object.values(this.todayTasks)) {
      if (completed) count++;
    }
    for (const task of this.customTasks) {
      if (task.completed) count++;
    }
    return count;
  }

  // 获取任务总 XP
  getTotalXp() {
    let xp = 0;
    for (const [id, completed] of Object.entries(this.todayTasks)) {
      if (completed && TASKS[id]) {
        xp += TASKS[id].xp;
      }
    }
    for (const task of this.customTasks) {
      if (task.completed && task.xp) {
        xp += task.xp;
      }
    }
    return xp;
  }

  // 添加自选任务
  addCustomTask(task) {
    this.customTasks.push({
      id: `custom_${Date.now()}`,
      name: task.name,
      icon: task.icon,
      xp: task.xp || 10,
      desc: task.desc || '',
      completed: false,
    });
  }

  // 序列化数据
  serialize() {
    return {
      todayTasks: this.todayTasks,
      customTasks: this.customTasks,
      lastResetDate: this.lastResetDate,
    };
  }

  // 反序列化
  deserialize(data) {
    if (data) {
      this.todayTasks = data.todayTasks || this.todayTasks;
      this.customTasks = data.customTasks || [];
      this.lastResetDate = data.lastResetDate;
    }
  }
}

module.exports = TaskManager;
