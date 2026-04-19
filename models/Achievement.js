// 成就系统
const { Storage, STORAGE_KEYS } = require('../utils/storage');

// 成就定义
const ACHIEVEMENTS = {
  // 新手成就
  FIRST_STEP: {
    id: 'first_step',
    name: '第一步',
    description: '完成第一个关卡',
    icon: 'star',
    condition: { type: 'level_complete', value: 1 },
  },
  BEGINNER: {
    id: 'beginner',
    name: '初学者',
    description: '累计获得 100 分',
    icon: 'score',
    condition: { type: 'score', value: 100 },
  },

  // 收集成就
  COLLECTOR_GREEN: {
    id: 'collector_green',
    name: '求知若渴',
    description: '收集 50 个求知绿碎片',
    icon: 'green',
    condition: { type: 'fragment', fragment: 'green', value: 50 },
  },
  COLLECTOR_ORANGE: {
    id: 'collector_orange',
    name: '活力四射',
    description: '收集 50 个活力橙碎片',
    icon: 'orange',
    condition: { type: 'fragment', fragment: 'orange', value: 50 },
  },
  COLLECTOR_BLUE: {
    id: 'collector_blue',
    name: '奋斗不止',
    description: '收集 50 个奋斗蓝碎片',
    icon: 'blue',
    condition: { type: 'fragment', fragment: 'blue', value: 50 },
  },
  COLLECTOR_PINK: {
    id: 'collector_pink',
    name: '温情脉脉',
    description: '收集 50 个温情粉碎片',
    icon: 'pink',
    condition: { type: 'fragment', fragment: 'pink', value: 50 },
  },
  COLLECTOR_GOLD: {
    id: 'collector_gold',
    name: '金玉满堂',
    description: '收集 50 个圆梦金碎片',
    icon: 'gold',
    condition: { type: 'fragment', fragment: 'gold', value: 50 },
  },
  MASTER_COLLECTOR: {
    id: 'master_collector',
    name: '收藏大师',
    description: '收集所有类型碎片各 100 个',
    icon: 'all',
    condition: { type: 'all_fragments', value: 100 },
  },

  // 阶段成就
  CHILDHOOD_COMPLETE: {
    id: 'childhood_complete',
    name: '童年记忆',
    description: '完成童年启蒙阶段（关卡 1-3）',
    icon: 'childhood',
    condition: { type: 'stage_complete', stage: 'childhood' },
  },
  GROWTH_COMPLETE: {
    id: 'growth_complete',
    name: '茁壮成长',
    description: '完成成长突破阶段（关卡 4-6）',
    icon: 'growth',
    condition: { type: 'stage_complete', stage: 'growth' },
  },
  WARMTH_COMPLETE: {
    id: 'warmth_complete',
    name: '温情时光',
    description: '完成温情相守阶段（关卡 7-9）',
    icon: 'warmth',
    condition: { type: 'stage_complete', stage: 'warmth' },
  },
  FULFILLMENT_COMPLETE: {
    id: 'fulfillment_complete',
    name: '圆满人生',
    description: '完成圆满收获阶段（关卡 10-12）',
    icon: 'fulfillment',
    condition: { type: 'stage_complete', stage: 'fulfillment' },
  },

  // 得分成就
  HIGH_SCORE_1000: {
    id: 'high_score_1000',
    name: '小有成就',
    description: '累计获得 1000 分',
    icon: 'score',
    condition: { type: 'score', value: 1000 },
  },
  HIGH_SCORE_5000: {
    id: 'high_score_5000',
    name: '声名鹊起',
    description: '累计获得 5000 分',
    icon: 'score',
    condition: { type: 'score', value: 5000 },
  },
  HIGH_SCORE_10000: {
    id: 'high_score_10000',
    name: '人生巅峰',
    description: '累计获得 10000 分',
    icon: 'crown',
    condition: { type: 'score', value: 10000 },
  },

  // 特殊成就
  PERFECT_CLEAR: {
    id: 'perfect_clear',
    name: '完美通关',
    description: '一个碎片都不消除的情况下通关',
    icon: 'perfect',
    condition: { type: 'perfect_clear', value: 1 },
  },
  GAME_MASTER: {
    id: 'game_master',
    name: '人生如戏',
    description: '完成全部关卡',
    icon: 'master',
    condition: { type: 'all_levels_complete', value: 12 },
  },
};

class AchievementManager {
  constructor() {
    this.storage = new Storage();
    this.unlockedIds = this.loadUnlocked();
    this.listeners = [];
  }

  loadUnlocked() {
    const saved = this.storage.get(STORAGE_KEYS.ACHIEVEMENTS);
    return saved || [];
  }

  save() {
    this.storage.set(STORAGE_KEYS.ACHIEVEMENTS, this.unlockedIds);
  }

  // 检查是否已解锁
  isUnlocked(id) {
    return this.unlockedIds.includes(id);
  }

  // 解锁成就（id 为成就定义里的字符串 id，如 first_step）
  unlock(id) {
    if (this.isUnlocked(id)) {
      return false;
    }

    const achievement =
      ACHIEVEMENTS[id] ||
      Object.values(ACHIEVEMENTS).find((a) => a.id === id);
    if (!achievement) {
      return false;
    }

    this.unlockedIds.push(achievement.id);
    this.save();

    // 触发通知
    this.notify({
      type: 'unlock',
      achievement,
    });

    return true;
  }

  // 获取所有已解锁成就
  getUnlocked() {
    return this.unlockedIds
      .map(id => ACHIEVEMENTS[id])
      .filter(Boolean);
  }

  // 获取所有成就
  getAll() {
    return Object.values(ACHIEVEMENTS);
  }

  // 获取已解锁成就数量
  getUnlockedCount() {
    return this.unlockedIds.length;
  }

  // 获取成就总数
  getTotalCount() {
    return Object.keys(ACHIEVEMENTS).length;
  }

  // 检查条件并解锁
  checkAndUnlock(condition, context) {
    const achievement = this.findByCondition(condition);
    if (achievement && !this.isUnlocked(achievement.id)) {
      this.unlock(achievement.id);
    }
  }

  // 根据条件查找成就
  findByCondition(condition) {
    return Object.values(ACHIEVEMENTS).find(a => {
      const c = a.condition;
      if (c.type !== condition.type) return false;
      if (c.value && c.value !== condition.value) return false;
      if (c.fragment && c.fragment !== condition.fragment) return false;
      if (c.stage && c.stage !== condition.stage) return false;
      return true;
    });
  }

  // 检查关卡完成
  onLevelComplete(level, context = {}) {
    // 检查第一个关卡成就
    if (level >= 1) {
      this.checkAndUnlock({ type: 'level_complete', value: 1 }, context);
    }
    // 检查阶段成就
    const stages = ['childhood', 'growth', 'warmth', 'fulfillment'];
    const stageLevels = {
      childhood: [1, 2, 3],
      growth: [4, 5, 6],
      warmth: [7, 8, 9],
      fulfillment: [10, 11, 12],
    };
    for (const [stage, levels] of Object.entries(stageLevels)) {
      if (levels.every(l => l <= level)) {
        this.checkAndUnlock({ type: 'stage_complete', stage }, context);
      }
    }
    // 检查全部完成
    if (level >= 12) {
      this.checkAndUnlock({ type: 'all_levels_complete', value: 12 }, context);
    }
  }

  // 检查得分变化
  onScoreChange(totalScore, context = {}) {
    const thresholds = [100, 1000, 5000, 10000];
    for (const threshold of thresholds) {
      if (totalScore >= threshold) {
        this.checkAndUnlock({ type: 'score', value: threshold }, context);
      }
    }
  }

  // 检查碎片收集
  onFragmentCollect(fragmentType, totalCount, context = {}) {
    // 检查单个碎片收集成就
    const thresholds = [50];
    for (const threshold of thresholds) {
      if (totalCount >= threshold) {
        this.checkAndUnlock({ type: 'fragment', fragment: fragmentType, value: threshold }, context);
      }
    }
    // 检查收藏大师
    if (context.allFragments) {
      const allReachThreshold = Object.values(context.allFragments).every(count => count >= 100);
      if (allReachThreshold) {
        this.checkAndUnlock({ type: 'all_fragments', value: 100 }, context);
      }
    }
  }

  // 添加监听器
  addListener(callback) {
    this.listeners.push(callback);
  }

  // 移除监听器
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  // 通知所有监听器
  notify(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (e) {
        console.error('Achievement listener error:', e);
      }
    });
  }

  // 重置成就
  reset() {
    this.unlockedIds = [];
    this.save();
  }
}

module.exports = {
  AchievementManager,
  ACHIEVEMENTS,
};
