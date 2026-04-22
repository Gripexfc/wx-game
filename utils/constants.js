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
  EAT: { id: 'eat', name: '好好吃饭', icon: '🍽️', xp: 15, desc: '认真吃好每一餐' },
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


// 场景类型
const SCENES = {
  HOME: { id: 'home', name: '温馨小窝', unlockLevel: 0 },
  GRASS: { id: 'grass', name: '草地野餐', unlockLevel: 5 },
  RIVER: { id: 'river', name: '河边泡澡', unlockLevel: 10 },
  FOREST: { id: 'forest', name: '森林探险', unlockLevel: 15 },
  BEACH: { id: 'beach', name: '海边日落', unlockLevel: 20 },
};


// 存储 Key
const STORAGE_KEYS = {
  LULU: 'lulu_data',
  TASKS: 'task_data',
  STATS: 'stats_data',
  ACHIEVEMENTS: 'achievement_data',
  SETTINGS: 'settings_data',
  /** 0～3，与 spec petVariantId 一致 */
  PET_VARIANT_ID: 'pet_variant_id',
};

// ==========================================
// 噜噜养成玩法优化常量（2026-04-20）
// ==========================================

// 推荐目标池（目标推荐引擎使用）
const RECOMMENDED_GOALS = [
  // 运动类
  { name: '每天跑步30分钟', type: 'habit', xp: 20, icon: '🏃', tag: '运动' },
  { name: '每天走10000步', type: 'habit', xp: 15, icon: '🚶', tag: '运动' },
  { name: '每天做20个俯卧撑', type: 'habit', xp: 15, icon: '💪', tag: '运动' },
  { name: '每天冥想10分钟', type: 'habit', xp: 10, icon: '🧘', tag: '健康' },
  // 学习类
  { name: '每天阅读30分钟', type: 'habit', xp: 20, icon: '📚', tag: '学习' },
  { name: '每天背20个单词', type: 'habit', xp: 15, icon: '🔤', tag: '学习' },
  { name: '每天学一个新知识点', type: 'habit', xp: 15, icon: '💡', tag: '学习' },
  // 健康类
  { name: '每天22:00前睡觉', type: 'habit', xp: 25, icon: '😴', tag: '健康' },
  { name: '每天喝8杯水', type: 'habit', xp: 10, icon: '💧', tag: '健康' },
  // 社交类
  { name: '每天给家人打电话', type: 'habit', xp: 20, icon: '📞', tag: '社交' },
  { name: '每天联系一个朋友', type: 'habit', xp: 15, icon: '💬', tag: '社交' },
  // 生活类
  { name: '每天整理房间', type: 'habit', xp: 15, icon: '🏠', tag: '生活' },
  { name: '每天记账', type: 'habit', xp: 10, icon: '📝', tag: '生活' },
  // 里程碑类
  { name: '读完一本书', type: 'milestone', xp: 30, icon: '📖', tag: '学习', totalProgress: 1 },
  { name: '跑完10公里', type: 'milestone', xp: 30, icon: '🏃', tag: '运动', totalProgress: 10 },
  { name: '减重2斤', type: 'milestone', xp: 30, icon: '⚖️', tag: '健康', totalProgress: 2 },
];

// 心愿模板（按标签分类，{goal} 会被替换为目标名称）
const WISH_TEMPLATES = {
  运动: [
    '我想一起去{goal}！', '陪我{goal}吧！', '一起{goal}会很开心的！', '今天要不要{goal}？',
  ],
  学习: [
    '我想一起{goal}！', '陪你{goal}好吗？', '一起{goal}吧！', '今天也{goal}，加油！',
  ],
  健康: [
    '我想{goal}！', '陪我{goal}吧~', '一起{goal}感觉更好！', '今天也要{goal}哦',
  ],
  社交: [
    '我想和你一起{goal}！', '陪我{goal}好吗？', '一起{goal}吧！', '今天约{goal}？',
  ],
  生活: [
    '我想一起{goal}！', '陪我{goal}吧！', '一起{goal}让生活更美好！', '今天也要{goal}呢',
  ],
  default: [
    '我想{goal}！', '陪我一起{goal}吧！', '今天一起{goal}！', '一起努力{goal}！',
  ],
};

// 心情参数
const MOOD = {
  THRESHOLD_SUPER_HAPPY: 95,
  THRESHOLD_HAPPY: 85,
  THRESHOLD_CHEERFUL: 65,
  THRESHOLD_QUIET: 40,
  // 速度因子
  SPEED_FACTOR: {
    SUPER_HAPPY: 1.3,
    HAPPY: 1.0,
    QUIET: 0.7,
    SAD: 0.5,
  },
  // 色彩倍数
  COLOR_MULT: {
    SUPER_HAPPY: 1.1,
    HAPPY: 1.0,
    QUIET: 0.85,
    SAD: 0.7,
  },
  // 断联衰减表
  DECAY: [
    { days: 0, decay: 0 },
    { days: 1, decay: -3 },
    { days: 2, decay: -8 },
    { days: 3, decay: -15 },
    { days: 5, decay: -25 },
    { days: 7, decay: -35 },
  ],
};

// 酷炫动作配置
const COOL_ACTIONS = {
  normal: [
    { id: 'heartbeat', name: '心跳突突', cost: 80, threshold: 70, duration: 90 },
    { id: 'dance', name: '蹦迪摇摆', cost: 80, threshold: 70, duration: 120 },
    { id: 'backflip', name: '后空翻', cost: 80, threshold: 70, duration: 60 },
    { id: 'rainbow', name: '彩虹屁', cost: 80, threshold: 70, duration: 150 },
    { id: 'takeoff', name: '原地起飞', cost: 80, threshold: 70, duration: 100 },
  ],
  advanced: [
    { id: 'supersugar', name: '超级撒糖', cost: 160, threshold: 80, duration: 180 },
    { id: 'royal', name: '王者降临', cost: 160, threshold: 80, duration: 200 },
    { id: 'transform', name: '变身觉醒', cost: 160, threshold: 80, duration: 240 },
  ],
  ultimate: [
    { id: 'universe', name: '宇宙级庆祝', cost: 280, threshold: 90, duration: 300 },
  ],
};

// 宠物对话模板
const LULU_DIALOGUES = {
  goodMorning: [
    '早安！新的一天，我们一起加油~', '早上好！今天也要元气满满哦！',
    '新的一天开始啦，噜噜陪你一起努力！',
  ],
  backAfterAbsence: [
    '你终于来了！我等你好久了', '你来了！噜噜一直在等你',
    '你回来啦，今天也要加油哦',
  ],
  deepAbsence: ['...你是不是忘了我', '我好想你陪陪我...', '你都不来...噜噜有点难过'],
  encouragement: [
    '别急，慢慢来', '你已经很棒了！', '再坚持一下下！', '加油哦，我陪着你',
    '我相信你做得到的！',
  ],
  missedTask: ['今天...没关系的，明天加油', '没关系哦，噜噜不怪你', '明天我们一起努力好不好'],
  milestone: {
    day3: ['3天了！你好厉害！', '三天了你！继续加油！'],
    day7: ['一周了！你是最棒的！', '一周噜噜好骄傲！'],
    day14: ['两周了！噜噜见证了你的坚持！', '两周！你真的好厉害！'],
    day30: ['一个月了！遇见更好的自己噜！', '一个月了！噜噜永远陪着你！'],
  },
  goalCreated: ['你有了新目标噜！我陪你一起！', '新目标！我记住了！'],
  goalCommitted: ['说好了哦，今天噜噜会监督你！', '我记住了，今天陪你一起！'],
  goalCompleted: ['做到了！你又进步了！', '太棒了！你真的好厉害！', '你做到了！噜噜好开心！'],
  goalAchieved: ['你做到了！！噜噜好骄傲！！', '做到了！你真的做到了！'],
  progressReminder: ['那个「{goal}」目标，还在吗？我陪你', '「{goal}」，噜噜想你了'],
  cheer: ['陪你在线！加油哦~', '加油加油！我陪着你！'],
};


module.exports = {
  LULU_STAGES,
  TASKS,
  XP_PER_LEVEL,
  COLORS,
  SCENES,
  STORAGE_KEYS,
  RECOMMENDED_GOALS,
  WISH_TEMPLATES,
  MOOD,
  COOL_ACTIONS,
  LULU_DIALOGUES,
};
