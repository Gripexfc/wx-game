const { XP_PER_LEVEL, LULU_STAGES, SCENES, ACCESSORY_TYPES } = require('../utils/constants');

class GrowthSystem {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.totalXp = 0;
    this.loveCoins = 0; // 爱心币
    this.unlockedScenes = ['home'];
    this.unlockedAccessories = [];
    this.consecutiveDays = 0;
    this.lastCheckIn = null;
  }

  // 获取升级所需 XP
  getXpForNextLevel() {
    const index = Math.min(this.level - 1, XP_PER_LEVEL.length - 1);
    return XP_PER_LEVEL[index];
  }

  // 获取当前阶段
  getStage() {
    if (this.level >= 16) return LULU_STAGES.ADULT;
    if (this.level >= 11) return LULU_STAGES.YOUTH;
    if (this.level >= 6) return LULU_STAGES.CHILD;
    return LULU_STAGES.BABY;
  }

  // 添加 XP（amount 可为负数，降级时从上一级借经验）
  addXp(amount) {
    if (amount === 0) return { leveled: false, newLevel: this.level };

    if (amount > 0) {
      this.xp += amount;
      this.totalXp += amount;

      // 检查是否升级
      while (this.xp >= this.getXpForNextLevel()) {
        this.xp -= this.getXpForNextLevel();
        this.levelUp();
      }
      return { leveled: this.xp === 0, newLevel: this.level };
    }

    // 扣除 XP（可能降级）
    this.xp += amount; // amount 为负
    this.totalXp = Math.max(0, this.totalXp + amount);
    while (this.xp < 0 && this.level > 1) {
      this.level--;
      this.xp += this.getXpForNextLevel();
    }
    if (this.xp < 0) this.xp = 0;
    return { leveled: true, newLevel: this.level };
  }

  // 升级
  levelUp() {
    this.level++;
    this.loveCoins++; // 每级送1个爱心币

    // 检查场景解锁
    this.checkSceneUnlock();

    // 检查成就
    this.checkAchievements();
  }

  // 检查场景解锁
  checkSceneUnlock() {
    for (const [id, scene] of Object.entries(SCENES)) {
      if (this.level >= scene.unlockLevel && !this.unlockedScenes.includes(id)) {
        this.unlockedScenes.push(id);
      }
    }
  }

  // 检查成就（简化版）
  checkAchievements() {
    // 满级成就
    if (this.level >= 20) {
      return 'full_level';
    }
    return null;
  }

  // 签到
  checkIn() {
    const today = this.getTodayString();

    if (this.lastCheckIn === today) {
      return { alreadyCheckedIn: true };
    }

    // 检查是否连续
    const yesterday = this.getYesterdayString();
    if (this.lastCheckIn === yesterday) {
      this.consecutiveDays++;
    } else {
      this.consecutiveDays = 1;
    }

    this.lastCheckIn = today;

    return {
      alreadyCheckedIn: false,
      consecutiveDays: this.consecutiveDays,
    };
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

  // 获取经验条进度 (0-1)
  getXpProgress() {
    return this.xp / this.getXpForNextLevel();
  }

  // 序列化
  serialize() {
    return {
      level: this.level,
      xp: this.xp,
      totalXp: this.totalXp,
      loveCoins: this.loveCoins,
      unlockedScenes: this.unlockedScenes,
      unlockedAccessories: this.unlockedAccessories,
      consecutiveDays: this.consecutiveDays,
      lastCheckIn: this.lastCheckIn,
    };
  }

  // 反序列化
  deserialize(data) {
    if (data) {
      this.level = data.level || 1;
      this.xp = data.xp || 0;
      this.totalXp = data.totalXp || 0;
      this.loveCoins = data.loveCoins || 0;
      this.unlockedScenes = data.unlockedScenes || ['home'];
      this.unlockedAccessories = data.unlockedAccessories || [];
      this.consecutiveDays = data.consecutiveDays || 0;
      this.lastCheckIn = data.lastCheckIn;
    }
  }
}

module.exports = GrowthSystem;
