const { XP_PER_LEVEL, LULU_STAGES, SCENES, ACCESSORY_TYPES } = require('../utils/constants');

class GrowthSystem {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.totalXp = 0;
    this.loveCoins = 0;
    this.loveStars = 0;
    this.unlockedScenes = ['home'];
    this.unlockedAccessories = [];
    this.consecutiveDays = 0;
    this.lastCheckIn = null;
  }

  getXpForNextLevel() {
    const index = Math.min(this.level - 1, XP_PER_LEVEL.length - 1);
    return XP_PER_LEVEL[index];
  }

  getStage() {
    if (this.level >= 16) return LULU_STAGES.ADULT;
    if (this.level >= 11) return LULU_STAGES.YOUTH;
    if (this.level >= 6) return LULU_STAGES.CHILD;
    return LULU_STAGES.BABY;
  }

  addXp(amount) {
    if (amount === 0) return { leveled: false, newLevel: this.level };

    if (amount > 0) {
      this.xp += amount;
      this.totalXp += amount;
      while (this.xp >= this.getXpForNextLevel()) {
        this.xp -= this.getXpForNextLevel();
        this.levelUp();
      }
      return { leveled: false, newLevel: this.level };
    }

    this.xp += amount;
    this.totalXp = Math.max(0, this.totalXp + amount);
    while (this.xp < 0 && this.level > 1) {
      this.level--;
      this.xp += this.getXpForNextLevel();
    }
    if (this.xp < 0) this.xp = 0;
    return { leveled: true, newLevel: this.level };
  }

  levelUp() {
    this.level++;
    this.loveCoins++;
    this.loveStars += 1;
    this.checkSceneUnlock();
    this.checkAchievements();
  }

  checkSceneUnlock() {
    for (const [id, scene] of Object.entries(SCENES)) {
      if (this.level >= scene.unlockLevel && !this.unlockedScenes.includes(id)) {
        this.unlockedScenes.push(id);
      }
    }
  }

  checkAchievements() {
    if (this.level >= 20) return 'full_level';
    return null;
  }

  checkIn() {
    const today = this.getTodayString();
    if (this.lastCheckIn === today) {
      return { alreadyCheckedIn: true };
    }
    const yesterday = this.getYesterdayString();
    if (this.lastCheckIn === yesterday) {
      this.consecutiveDays++;
    } else {
      this.consecutiveDays = 1;
    }
    this.lastCheckIn = today;
    return { alreadyCheckedIn: false, consecutiveDays: this.consecutiveDays };
  }

  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  getYesterdayString() {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  getXpProgress() {
    return this.xp / this.getXpForNextLevel();
  }

  // ========== 新增：爱星系统 ==========

  /** 心愿任务完成，奖励爱星（固定+1） */
  addWishLoveStar() {
    this.loveStars += 1;
  }

  /** 消耗爱星（如解锁酷炫动作） */
  spendLoveStars(amount) {
    if (this.loveStars < amount) {
      throw new Error('爱星不足');
    }
    this.loveStars -= amount;
  }

  /** 增加爱星（后台奖励等） */
  addLoveStars(amount) {
    this.loveStars += amount;
  }

  serialize() {
    return {
      level: this.level,
      xp: this.xp,
      totalXp: this.totalXp,
      loveCoins: this.loveCoins,
      loveStars: this.loveStars,
      unlockedScenes: this.unlockedScenes,
      unlockedAccessories: this.unlockedAccessories,
      consecutiveDays: this.consecutiveDays,
      lastCheckIn: this.lastCheckIn,
    };
  }

  deserialize(data) {
    if (data) {
      this.level = data.level || 1;
      this.xp = data.xp || 0;
      this.totalXp = data.totalXp || 0;
      this.loveCoins = data.loveCoins || 0;
      this.loveStars = data.loveStars || 0;
      this.unlockedScenes = data.unlockedScenes || ['home'];
      this.unlockedAccessories = data.unlockedAccessories || [];
      this.consecutiveDays = data.consecutiveDays || 0;
      this.lastCheckIn = data.lastCheckIn;
    }
  }
}

module.exports = GrowthSystem;
