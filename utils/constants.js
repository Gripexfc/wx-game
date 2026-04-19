// 游戏基础配置
const GAME_WIDTH = 375;           // 设计宽度（iPhone 6 基准）
const GAME_HEIGHT = 667;          // 设计高度
const BOARD_SIZE = 6;             // 棋盘 6×6
const TILE_SIZE = 50;             // 碎片单元格尺寸
const TILE_GAP = 4;               // 碎片间距

// 颜色配置（符合设计文档暖黄、浅绿、淡蓝）
const COLORS = {
  PRIMARY: '#F5B041',      // 暖阳黄
  SECONDARY: '#7DCEA0',    // 希望绿
  ACCENT: '#85C1E9',       // 温暖蓝
  CORAL: '#F0A500',        // 达成橙
  BG_START: '#FFF9E6',     // 背景渐变起点
  BG_END: '#FFFFFF',       // 背景渐变终点
  TEXT_PRIMARY: '#5D4E37', // 文字主色
  TEXT_SECONDARY: '#8B7355', // 文字辅色
};

// 碎片类型（5种时光碎片）
const TILE_TYPES = {
  GREEN: { id: 'green', name: '幼年·求知绿', color: '#7DCEA0' },
  ORANGE: { id: 'orange', name: '少年·活力橙', color: '#F5B041' },
  BLUE: { id: 'blue', name: '青年·奋斗蓝', color: '#85C1E9' },
  PINK: { id: 'pink', name: '中年·温情粉', color: '#F5B8C5' },
  GOLD: { id: 'gold', name: '成就·圆梦金', color: '#FFD700' },
};

const TILE_TYPE_KEYS = Object.keys(TILE_TYPES);

// 游戏状态
const GAME_STATE = {
  BOOT: 'boot',
  MENU: 'menu',
  LEVEL_SELECT: 'levelSelect',
  PLAYING: 'playing',
  PAUSED: 'paused',
  RESULT: 'result',
  GALLERY: 'gallery',
  REPORT: 'report',
};

// 关卡阶段
const LEVEL_STAGES = {
  CHILDHOOD: { id: 'childhood', name: '童年启蒙', levels: [1, 2, 3] },
  GROWTH: { id: 'growth', name: '成长突破', levels: [4, 5, 6] },
  WARMTH: { id: 'warmth', name: '温情相守', levels: [7, 8, 9] },
  FULFILLMENT: { id: 'fulfillment', name: '圆满收获', levels: [10, 11, 12] },
};

module.exports = {
  GAME_WIDTH, GAME_HEIGHT,
  BOARD_SIZE, TILE_SIZE, TILE_GAP,
  COLORS, TILE_TYPES, TILE_TYPE_KEYS,
  GAME_STATE, LEVEL_STAGES,
};
