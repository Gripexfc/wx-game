// 进度存档系统
const { Storage, STORAGE_KEYS } = require('../utils/storage');
const { LEVEL_STAGES, TILE_TYPES, TILE_TYPE_KEYS } = require('../utils/constants');

class ProgressManager {
  constructor() {
    this.storage = new Storage();
    this.data = this.load();
  }

  load() {
    const saved = this.storage.get(STORAGE_KEYS.PROGRESS);
    if (saved) {
      return saved;
    }
    return this.getDefaultData();
  }

  getDefaultData() {
    return {
      level: 1,              // 当前关卡
      score: 0,               // 总得分
      fragments: {},          // 收集的时光碎片 { green: 0, orange: 0, ... }
      achievements: [],       // 已解锁成就 ID 列表
      totalPlayTime: 0,      // 总游戏时长（秒）
      lastPlayedAt: null,    // 最后游玩时间
      createdAt: Date.now(), // 创建时间
    };
  }

  save() {
    this.storage.set(STORAGE_KEYS.PROGRESS, this.data);
  }

  // 更新数据
  update(data) {
    this.data = { ...this.data, ...data };
    this.data.lastPlayedAt = Date.now();
    this.save();
  }

  // 增加分数
  addScore(points) {
    this.data.score += points;
    this.data.lastPlayedAt = Date.now();
    this.save();
    return this.data.score;
  }

  // 收集碎片
  collectFragment(type, count = 1) {
    if (!this.data.fragments[type]) {
      this.data.fragments[type] = 0;
    }
    this.data.fragments[type] += count;
    this.data.lastPlayedAt = Date.now();
    this.save();
    return this.data.fragments[type];
  }

  // 获取碎片数量
  getFragmentCount(type) {
    return this.data.fragments[type] || 0;
  }

  // 获取所有碎片统计
  getAllFragments() {
    const result = {};
    TILE_TYPE_KEYS.forEach(key => {
      result[key] = this.data.fragments[key] || 0;
    });
    return result;
  }

  // 解锁成就
  unlockAchievement(achievementId) {
    if (!this.data.achievements.includes(achievementId)) {
      this.data.achievements.push(achievementId);
      this.data.lastPlayedAt = Date.now();
      this.save();
      return true;
    }
    return false;
  }

  // 检查成就是否已解锁
  isAchievementUnlocked(achievementId) {
    return this.data.achievements.includes(achievementId);
  }

  // 获取所有已解锁成就
  getUnlockedAchievements() {
    return [...this.data.achievements];
  }

  // 进入下一关
  nextLevel() {
    const maxLevel = 12;
    if (this.data.level < maxLevel) {
      this.data.level++;
      this.data.lastPlayedAt = Date.now();
      this.save();
      return this.data.level;
    }
    return maxLevel;
  }

  // 设置当前关卡
  setLevel(level) {
    const maxLevel = 12;
    this.data.level = Math.min(Math.max(1, level), maxLevel);
    this.data.lastPlayedAt = Date.now();
    this.save();
    return this.data.level;
  }

  // 获取当前关卡
  getLevel() {
    return this.data.level;
  }

  // 关卡是否已解锁（当前进度关卡及之前的关卡可玩）
  isLevelUnlocked(levelId) {
    const maxLevel = 12;
    const n = Math.floor(Number(levelId));
    if (Number.isNaN(n) || n < 1 || n > maxLevel) return false;
    return n <= this.data.level;
  }

  // 获取当前阶段
  getCurrentStage() {
    const level = this.data.level;
    for (const stage of Object.values(LEVEL_STAGES)) {
      if (stage.levels.includes(level)) {
        return stage;
      }
    }
    return LEVEL_STAGES.CHILDHOOD;
  }

  // 更新游戏时长
  addPlayTime(seconds) {
    this.data.totalPlayTime += seconds;
    this.data.lastPlayedAt = Date.now();
    this.save();
  }

  // 获取游戏时长（秒）
  getPlayTime() {
    return this.data.totalPlayTime;
  }

  // 获取游戏时长（格式化）
  getPlayTimeFormatted() {
    const seconds = this.data.totalPlayTime;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    }
    return `${secs}秒`;
  }

  // 重置存档
  reset() {
    this.data = this.getDefaultData();
    this.save();
  }

  // 导出存档数据
  export() {
    return { ...this.data };
  }

  // 导入存档数据
  import(data) {
    if (data && typeof data === 'object') {
      this.data = { ...this.getDefaultData(), ...data };
      this.save();
      return true;
    }
    return false;
  }

  // 获取完整进度摘要
  getSummary() {
    const fragments = this.getAllFragments();
    const totalFragments = TILE_TYPE_KEYS.reduce(
      (sum, key) => sum + (fragments[key] || 0),
      0
    );
    return {
      level: this.data.level,
      score: this.data.score,
      fragments,
      totalFragments,
      completedLevels: Math.max(0, this.data.level - 1),
      achievementsUnlocked: this.data.achievements.length,
      totalAchievements: 12, // 假设总共12个成就
      playTime: this.getPlayTimeFormatted(),
      currentStage: this.getCurrentStage(),
    };
  }
}

module.exports = ProgressManager;
