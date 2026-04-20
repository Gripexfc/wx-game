// 宠物情绪状态管理器：心情5级 + 衰减曲线 + 日终结算 + 里程碑检测

class PetStateManager {
  constructor() {
    this.moodValue = 68;
    this.consecutiveDays = 0;
    this.totalDays = 0;
    this.completedDays = 0;
    this.lastSettleDate = null;
    this.petEveningMood = 68;
    this.milestones = { day3: false, day7: false, day14: false, day30: false };
    this._storage = null;
  }

  setStorage(storage) {
    this._storage = storage;
  }

  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  // 心情级别（5级）
  getMoodLevel() {
    if (this.moodValue >= 95) return '超级幸福';
    if (this.moodValue >= 85) return '幸福';
    if (this.moodValue >= 65) return '开心';
    if (this.moodValue >= 40) return '安静';
    return '沮丧';
  }

  // 心情对应的动画速度因子
  getMoodSpeedFactor() {
    if (this.moodValue >= 85) return 1.3;
    if (this.moodValue >= 65) return 1.0;
    if (this.moodValue >= 40) return 0.7;
    return 0.5;
  }

  // 心情对应的色彩饱和度倍数
  getMoodColorMultiplier() {
    if (this.moodValue >= 85) return 1.1;
    if (this.moodValue >= 65) return 1.0;
    if (this.moodValue >= 40) return 0.85;
    return 0.7;
  }

  // 心情对XP的倍率
  getMoodXPMultiplier() {
    if (this.moodValue >= 85) return 1.2;
    if (this.moodValue >= 60) return 1.0;
    if (this.moodValue >= 40) return 0.9;
    return 0.8;
  }

  // 断联心情衰减计算
  calculateMoodDecay(disconnectDays) {
    const table = [
      { days: 0, decay: 0 },
      { days: 1, decay: -3 },
      { days: 2, decay: -8 },
      { days: 3, decay: -15 },
      { days: 5, decay: -25 },
      { days: 7, decay: -35 },
    ];
    let decay = 0;
    if (disconnectDays >= 7) {
      decay = -35 - (disconnectDays - 7) * 5;
    } else {
      for (const row of table) {
        if (disconnectDays <= row.days) {
          decay = row.decay;
          break;
        }
        decay = row.decay;
      }
    }
    return decay;
  }

  // 日终结算核心逻辑
  settleDaily(disconnectDays, { completedCount, totalCommitments, consecutiveDays }) {
    // 1. 断联衰减
    const decay = this.calculateMoodDecay(disconnectDays);
    this.moodValue = Math.max(0, this.moodValue + decay);

    // 2. 表现分
    let score = completedCount * 15;
    score += this._consecutiveBonus(consecutiveDays);
    score = Math.min(score, 100);

    // 3. 心情更新（断联衰减已在上面处理，这里只处理当日承诺情况）
    if (disconnectDays === 0 && totalCommitments > 0 && completedCount === 0) {
      // 当天来了但全部承诺漏做 → 心情下降
      this.moodValue = Math.max(20, this.moodValue - 8);
    } else if (completedCount > 0) {
      const moodBoost = Math.min(Math.round(score * 0.3), 30);
      this.moodValue = Math.min(100, this.moodValue + moodBoost);
    }

    // 4. 连签更新
    if (completedCount > 0) {
      this.consecutiveDays += 1;
    } else {
      this.consecutiveDays = 0;
    }

    // 5. 里程碑统计
    this.totalDays += 1;
    if (completedCount > 0) {
      this.completedDays += 1;
    }

    // 6. 记录入睡心情
    this.petEveningMood = this.moodValue;
    this.lastSettleDate = this.getTodayString();
  }

  _consecutiveBonus(days) {
    if (days >= 30) return 12;
    if (days >= 15) return 10;
    if (days >= 8) return 8;
    if (days >= 4) return 5;
    if (days >= 1) return 3;
    return 0;
  }

  // 里程碑检测（返回新触发的里程碑ID，无则null）
  checkMilestone() {
    if (!this.milestones.day3 && this.consecutiveDays >= 3) {
      this.milestones.day3 = true;
      return 'day3';
    }
    if (!this.milestones.day7 && this.consecutiveDays >= 7) {
      this.milestones.day7 = true;
      return 'day7';
    }
    if (!this.milestones.day14 && this.consecutiveDays >= 14) {
      this.milestones.day14 = true;
      return 'day14';
    }
    if (!this.milestones.day30 && this.consecutiveDays >= 30) {
      this.milestones.day30 = true;
      return 'day30';
    }
    return null;
  }

  // 计算半年完成度百分比
  getCompletionRate() {
    if (this.totalDays === 0) return 0;
    return Math.round((this.completedDays / this.totalDays) * 100);
  }

  // 调整心情值（外部调用，如任务完成时）
  adjustMood(delta) {
    this.moodValue = Math.min(100, Math.max(0, this.moodValue + delta));
  }

  // 获取断联归来时的问候语
  getAbsenceGreeting(disconnectDays) {
    const { LULU_DIALOGUES } = require('../utils/constants');
    if (disconnectDays >= 3) {
      const templates = LULU_DIALOGUES.deepAbsence;
      return templates[Math.floor(Math.random() * templates.length)];
    }
    if (disconnectDays >= 1) {
      const templates = LULU_DIALOGUES.backAfterAbsence;
      return templates[Math.floor(Math.random() * templates.length)];
    }
    return null;
  }

  serialize() {
    return {
      moodValue: this.moodValue,
      consecutiveDays: this.consecutiveDays,
      totalDays: this.totalDays,
      completedDays: this.completedDays,
      lastSettleDate: this.lastSettleDate,
      petEveningMood: this.petEveningMood,
      milestones: this.milestones,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.moodValue = data.moodValue ?? 68;
    this.consecutiveDays = data.consecutiveDays ?? 0;
    this.totalDays = data.totalDays ?? 0;
    this.completedDays = data.completedDays ?? 0;
    this.lastSettleDate = data.lastSettleDate ?? null;
    this.petEveningMood = data.petEveningMood ?? this.moodValue;
    this.milestones = { ...this.milestones, ...data.milestones };
  }
}

module.exports = PetStateManager;
