// 游戏常量配置

// 噜噜成长阶段
const LULU_STAGES = {
  BABY: { id: 'baby', name: '幼崽噜噜', level: [1, 5] },
  CHILD: { id: 'child', name: '少年噜噜', level: [6, 10] },
  YOUTH: { id: 'youth', name: '青年噜噜', level: [11, 15] },
  ADULT: { id: 'adult', name: '成体噜噜', level: [16, 20] },
};

// 任务配置
const TASKS = {
  FITNESS: { id: 'fitness', name: '健身', icon: '🏃', xp: 20, desc: '完成30分钟运动' },
  EAT: { id: 'eat', name: '吃饭', icon: '🍽️', xp: 15, desc: '记录正餐' },
  READ: { id: 'read', name: '阅读', icon: '📚', xp: 20, desc: '阅读30分钟' },
  SLEEP: { id: 'sleep', name: '睡眠', icon: '😴', xp: 25, desc: '早睡打卡(22:00前)' },
};

// 升级所需 XP（Lv N → Lv N+1）
const XP_PER_LEVEL = [100, 150, 200, 250, 300, 350, 400, 450, 500];

// 颜色配置
const COLORS = {
  PRIMARY: '#8B7355',    // 水豚棕
  SECONDARY: '#7DCEA0',  // 草地绿
  ACCENT: '#F5B041',     // 阳光黄
  BG_START: '#FFF9E6',   // 背景渐变
  BG_END: '#FFFFFF',
  TEXT_PRIMARY: '#5D4E37',
  TEXT_SECONDARY: '#8B7355',
  SUCCESS: '#E67E22',
};

// 配饰类型
const ACCESSORY_TYPES = {
  HAT: { id: 'hat', name: '帽子' },
  SCARF: { id: 'scarf', name: '围巾' },
  GLASSES: { id: 'glasses', name: '眼镜' },
  BAG: { id: 'bag', name: '背包' },
};

// 场景类型
const SCENES = {
  HOME: { id: 'home', name: '温馨小窝', unlockLevel: 0 },
  GRASS: { id: 'grass', name: '草地野餐', unlockLevel: 5 },
  RIVER: { id: 'river', name: '河边泡澡', unlockLevel: 10 },
  FOREST: { id: 'forest', name: '森林探险', unlockLevel: 15 },
  BEACH: { id: 'beach', name: '海边日落', unlockLevel: 20 },
};

// 互动动作
const LULU_ACTIONS = ['摇头', '微笑', '蹭蹭', '蹦跳', '打哈欠'];

// 存储 Key
const STORAGE_KEYS = {
  LULU: 'lulu_data',
  TASKS: 'task_data',
  STATS: 'stats_data',
  ACHIEVEMENTS: 'achievement_data',
  SETTINGS: 'settings_data',
};

module.exports = {
  LULU_STAGES,
  TASKS,
  XP_PER_LEVEL,
  COLORS,
  ACCESSORY_TYPES,
  SCENES,
  LULU_ACTIONS,
  STORAGE_KEYS,
};
