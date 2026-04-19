# 《人生拾光》微信小游戏实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一款符合产品文档的三消合成微信小游戏，核心玩法完整、界面正向治愈、商业合规

**Architecture:** 采用状态机驱动的游戏主循环，棋盘逻辑与渲染分离，JSON 配置驱动关卡数据，微信本地存储持久化进度

**Tech Stack:** 微信原生 Canvas API + JavaScript (ES6+)，无第三方框架

---

## 项目文件结构

```
/wx-game
├── game.js                    # 游戏主入口（微信适配层）
├── core/
│   ├── Game.js               # 游戏主控制器（状态机）
│   ├── Board.js              # 6×6 棋盘逻辑
│   ├── Tile.js               # 碎片数据模型
│   └── MatchEngine.js        # 匹配判定与消除引擎
├── systems/
│   ├── Level.js              # 关卡系统（JSON 配置驱动）
│   ├── Progress.js           # 本地存档系统
│   ├── Achievement.js        # 成就系统
│   ├── Audio.js              # 音效管理
│   └── Ad.js                 # 微信广告接入
├── ui/
│   ├── UIManager.js          # UI 层级与切换管理
│   ├── BootScreen.js         # 启动页
│   ├── MainMenu.js           # 主菜单
│   ├── LevelSelect.js        # 关卡选择
│   ├── GameView.js           # 游戏主视图（棋盘渲染）
│   ├── HUD.js                # 游戏内信息栏
│   ├── ResultPopup.js        # 结算弹窗
│   ├── Gallery.js            # 成长图鉴
│   └── Report.js             # 成长报告
├── utils/
│   ├── constants.js          # 常量（颜色/尺寸/碎片类型）
│   ├── tween.js              # 缓动动画工具
│   ├── storage.js            # 本地存储封装
│   └── helpers.js            # 工具函数
├── assets/
│   ├── images/               # PNG 图集（碎片图、UI 图标）
│   └── audio/                # BGM、音效 MP3
├── levels/                   # JSON 关卡配置
│   └── level_*.json
├── docs/
│   ├── design/              # 设计文档
│   └── plans/                # 本计划
├── game.json                # 微信 game.json
├── project.config.json      # 微信项目配置
└── wechatgame/              # 微信适配层（subdomain）
    └── game.js              # 微信游戏入口（bridge）
```

---

## 实现阶段

### 阶段一：项目脚手架（基础层）

#### Task 1: 微信项目配置

**Files:**
- Create: `project.config.json`
- Create: `game.json`
- Create: `wechatgame/game.js`

**微信开发者工具配置（需手动操作，非代码步骤）：**
1. 下载并打开微信开发者工具
2. 新建项目，路径选择 `/Users/edy/Desktop/wx-game`
3. AppID 填写个人 AppID 或测试号
4. 勾选"不需要授权"

**project.config.json 内容：**
```json
{
  "description": "人生拾光微信小游戏",
  "packOptions": {
    "ignore": ["node_modules", "docs", "*.md"]
  },
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": false,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": true
  },
  "compileType": "game",
  "libVersion": "2.19.0",
  "appid": "",
  "projectname": "life-gathering",
  "condition": {}
}
```

**game.json 内容：**
```json
{
  "deviceOrientation": "portrait",
  "showStatusBar": false,
  "networkTimeout": 60000
}
```

**wechatgame/game.js 桥接层（核心入口）：**
```javascript
// 微信小游戏适配层 - 将微信 API 适配为标准游戏接口
const wxAdapter = {
  // 替代浏览器 requestAnimationFrame
  requestAnimationFrame: wx.requestAnimationFrame,
  // 替代浏览器 addEventListener (touch)
  onTouchStart: (cb) => wx.onTouchStart(cb),
  onTouchMove: (cb) => wx.onTouchMove(cb),
  onTouchEnd: (cb) => wx.onTouchEnd(cb),
  // 替代浏览器 Image
  createImage: () => wx.createImage(),
  // 替代浏览器 Audio
  createInnerAudioContext: () => wx.createInnerAudioContext(),
  // 替代浏览器 localStorage
  setStorage: wx.setStorageSync,
  getStorage: wx.getStorageSync,
  removeStorage: wx.removeStorageSync,
  // 微信广告 API
  createRewardedVideoAd: wx.createRewardedVideoAd,
  createInterstitialAd: wx.createInterstitialAd,
};

module.exports = wxAdapter;
```

**Steps:**
- [ ] **Step 1: 创建 `project.config.json`**
- [ ] **Step 2: 创建 `game.json`**
- [ ] **Step 3: 创建 `wechatgame/game.js` 适配层**
- [ ] **Step 4: Commit: "feat: 微信项目脚手架配置"**

---

#### Task 2: 常量与工具层

**Files:**
- Create: `utils/constants.js`
- Create: `utils/helpers.js`
- Create: `utils/tween.js`
- Create: `utils/storage.js`

**utils/constants.js — 全局常量：**
```javascript
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
```

**utils/helpers.js — 工具函数：**
```javascript
// 随机整数 [min, max]
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机从数组中取元素
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 延迟执行 Promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 计算两点距离
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 限制数值范围
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 线性插值
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 角度转弧度
function degToRad(deg) {
  return deg * Math.PI / 180;
}

module.exports = {
  randomInt, randomPick, delay, distance, clamp, lerp, degToRad,
};
```

**utils/tween.js — 缓动动画（简化版）：**
```javascript
// 缓动函数库
const Easing = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

// Tween 实例管理器
class TweenManager {
  constructor() {
    this.tweens = [];
  }

  add(obj, targetProps, duration, easing = 'easeOut') {
    const startProps = {};
    for (const key in targetProps) {
      startProps[key] = obj[key];
    }
    const tween = {
      obj, startProps, targetProps,
      duration, startTime: Date.now(),
      easing: Easing[easing] || Easing.linear,
      done: false,
    };
    this.tweens.push(tween);
    return tween;
  }

  update() {
    const now = Date.now();
    this.tweens = this.tweens.filter(t => {
      if (t.done) return false;
      const elapsed = now - t.startTime;
      const progress = Math.min(elapsed / t.duration, 1);
      const easedProgress = t.easing(progress);
      for (const key in t.targetProps) {
        t.obj[key] = t.startProps[key] + (t.targetProps[key] - t.startProps[key]) * easedProgress;
      }
      if (progress >= 1) {
        t.done = true;
      }
      return !t.done;
    });
  }
}

module.exports = { TweenManager, Easing };
```

**utils/storage.js — 本地存储封装：**
```javascript
// 本地存储 key 常量
const STORAGE_KEYS = {
  PROGRESS: 'life_gathering_progress',
  FRAGMENTS: 'life_gathering_fragments',
  ACHIEVEMENTS: 'life_gathering_achievements',
  SETTINGS: 'life_gathering_settings',
};

class Storage {
  constructor() {
    this.cache = {};
  }

  set(key, value) {
    const jsonStr = JSON.stringify(value);
    try {
      wx.setStorageSync(key, jsonStr);
      this.cache[key] = value;
    } catch (e) {
      console.error('Storage set error:', e);
    }
  }

  get(key, defaultValue = null) {
    if (this.cache[key] !== undefined) {
      return this.cache[key];
    }
    try {
      const value = wx.getStorageSync(key);
      if (value) {
        const parsed = JSON.parse(value);
        this.cache[key] = parsed;
        return parsed;
      }
    } catch (e) {
      console.error('Storage get error:', e);
    }
    return defaultValue;
  }

  remove(key) {
    try {
      wx.removeStorageSync(key);
      delete this.cache[key];
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  }

  clear() {
    try {
      wx.clearStorageSync();
      this.cache = {};
    } catch (e) {
      console.error('Storage clear error:', e);
    }
  }
}

module.exports = { Storage, STORAGE_KEYS };
```

**Steps:**
- [ ] **Step 1: 创建 `utils/constants.js`**
- [ ] **Step 2: 创建 `utils/helpers.js`**
- [ ] **Step 3: 创建 `utils/tween.js`**
- [ ] **Step 4: 创建 `utils/storage.js`**
- [ ] **Step 5: Commit: "feat: 常量与工具层"**

---

### 阶段二：核心游戏逻辑

#### Task 3: Tile 数据模型

**Files:**
- Create: `core/Tile.js`

**core/Tile.js：**
```javascript
const { TILE_TYPE_KEYS, TILE_TYPES } = require('../utils/constants');
const { randomPick } = require('../utils/helpers');

class Tile {
  constructor(type, row, col) {
    this.type = type || randomPick(TILE_TYPE_KEYS);
    this.row = row;
    this.col = col;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.scale = 1;
    this.alpha = 1;
    this.rotation = 0;
    this.isMatched = false;
    this.isNew = false;
  }

  // 获取颜色
  getColor() {
    return TILE_TYPES[this.type]?.color || '#CCCCCC';
  }

  // 获取名称
  getName() {
    return TILE_TYPES[this.type]?.name || '未知';
  }

  // 是否可消除（相同类型）
  canMatchWith(other) {
    return other && this.type === other.type;
  }

  // 重置位置
  resetPosition() {
    this.x = this.col * (TILE_SIZE + TILE_GAP);
    this.y = this.row * (TILE_SIZE + TILE_GAP);
    this.targetX = this.x;
    this.targetY = this.y;
  }
}

module.exports = Tile;
```

**Steps:**
- [ ] **Step 1: 创建 `core/Tile.js`**
- [ ] **Step 2: Commit: "feat: Tile 数据模型"**

---

#### Task 4: Board 棋盘逻辑

**Files:**
- Create: `core/Board.js`

**core/Board.js — 6×6 棋盘管理：**
```javascript
const Tile = require('./Tile');
const { BOARD_SIZE, TILE_SIZE, TILE_GAP, TILE_TYPE_KEYS } = require('../utils/constants');
const { randomPick } = require('../utils/helpers');

class Board {
  constructor() {
    this.grid = []; // 二维数组 [row][col]
    this.width = BOARD_SIZE;
    this.height = BOARD_SIZE;
  }

  // 初始化棋盘
  init() {
    this.grid = [];
    for (let row = 0; row < this.height; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.width; col++) {
        let type = this._generateValidType(row, col);
        const tile = new Tile(type, row, col);
        tile.resetPosition();
        this.grid[row][col] = tile;
      }
    }
  }

  // 生成不造成初始匹配的类型
  _generateValidType(row, col) {
    let attempts = 0;
    let type;
    do {
      type = randomPick(TILE_TYPE_KEYS);
      attempts++;
    } while (attempts < 50 && this._wouldMatch(row, col, type));
    return type;
  }

  // 检查是否会形成初始匹配
  _wouldMatch(row, col, type) {
    // 检查左侧两个
    if (col >= 2) {
      if (this.grid[row][col - 1]?.type === type &&
          this.grid[row][col - 2]?.type === type) {
        return true;
      }
    }
    // 检查上方两个
    if (row >= 2) {
      if (this.grid[row - 1]?.[col]?.type === type &&
          this.grid[row - 2]?.[col]?.type === type) {
        return true;
      }
    }
    return false;
  }

  // 获取碎片
  getTile(row, col) {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
      return null;
    }
    return this.grid[row][col];
  }

  // 设置碎片
  setTile(row, col, tile) {
    this.grid[row][col] = tile;
    if (tile) {
      tile.row = row;
      tile.col = col;
    }
  }

  // 交换两个碎片
  swap(tile1, tile2) {
    const { row: r1, col: c1 } = tile1;
    const { row: r2, col: c2 } = tile2;

    this.setTile(r1, c1, tile2);
    this.setTile(r2, c2, tile1);

    tile1.targetX = c2 * (TILE_SIZE + TILE_GAP);
    tile1.targetY = r2 * (TILE_SIZE + TILE_GAP);
    tile2.targetX = c1 * (TILE_SIZE + TILE_GAP);
    tile2.targetY = r1 * (TILE_SIZE + TILE_GAP);

    tile1.row = r2; tile1.col = c2;
    tile2.row = r1; tile2.col = c1;
  }

  // 查找所有匹配组
  findMatches() {
    const matches = [];
    const visited = new Set();

    // 横向匹配
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width - 2; col++) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        const match = [tile];
        let c = col + 1;
        while (c < this.width && this.grid[row][c]?.type === tile.type) {
          match.push(this.grid[row][c]);
          c++;
        }
        if (match.length >= 3) {
          matches.push(match);
        }
      }
    }

    // 纵向匹配
    for (let col = 0; col < this.width; col++) {
      for (let row = 0; row < this.height - 2; row++) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        const match = [tile];
        let r = row + 1;
        while (r < this.height && this.grid[r]?.[col]?.type === tile.type) {
          match.push(this.grid[r][col]);
          r++;
        }
        if (match.length >= 3) {
          matches.push(match);
        }
      }
    }

    return matches;
  }

  // 标记匹配碎片
  markMatches(matches) {
    matches.forEach(group => {
      group.forEach(tile => {
        tile.isMatched = true;
      });
    });
  }

  // 移除匹配碎片
  removeMatches() {
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.isMatched) {
          this.grid[row][col] = null;
        }
      }
    }
  }

  // 下落填补空白
  dropTiles() {
    const drops = [];
    for (let col = 0; col < this.width; col++) {
      let emptyRow = this.height - 1;
      for (let row = this.height - 1; row >= 0; row--) {
        if (this.grid[row][col]) {
          if (row !== emptyRow) {
            const tile = this.grid[row][col];
            this.grid[emptyRow][col] = tile;
            this.grid[row][col] = null;
            tile.row = emptyRow;
            tile.targetY = emptyRow * (TILE_SIZE + TILE_GAP);
            drops.push(tile);
          }
          emptyRow--;
        }
      }
      // 生成新碎片填满空白
      for (let row = emptyRow; row >= 0; row--) {
        const type = randomPick(TILE_TYPE_KEYS);
        const tile = new Tile(type, row, col);
        tile.isNew = true;
        tile.y = -(emptyRow - row + 1) * (TILE_SIZE + TILE_GAP);
        tile.targetY = row * (TILE_SIZE + TILE_GAP);
        tile.resetPosition();
        this.grid[row][col] = tile;
        drops.push(tile);
      }
    }
    return drops;
  }

  // 检查是否有可移动的匹配
  hasPossibleMoves() {
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        // 尝试向右交换
        if (col < this.width - 1) {
          this.swap(this.grid[row][col], this.grid[row][col + 1]);
          if (this.findMatches().length > 0) {
            this.swap(this.grid[row][col], this.grid[row][col + 1]);
            return true;
          }
          this.swap(this.grid[row][col], this.grid[row][col + 1]);
        }
        // 尝试向下交换
        if (row < this.height - 1) {
          this.swap(this.grid[row][col], this.grid[row + 1][col]);
          if (this.findMatches().length > 0) {
            this.swap(this.grid[row][col], this.grid[row + 1][col]);
            return true;
          }
          this.swap(this.grid[row][col], this.grid[row + 1][col]);
        }
      }
    }
    return false;
  }

  // 获取所有碎片类型统计
  getTileTypeStats() {
    const stats = {};
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const tile = this.grid[row][col];
        if (tile) {
          stats[tile.type] = (stats[tile.type] || 0) + 1;
        }
      }
    }
    return stats;
  }
}

module.exports = Board;
```

**Steps:**
- [ ] **Step 1: 创建 `core/Board.js`**
- [ ] **Step 2: Commit: "feat: Board 棋盘逻辑"**

---

#### Task 5: MatchEngine 匹配判定引擎

**Files:**
- Create: `core/MatchEngine.js`

**core/MatchEngine.js — 匹配判定与消除流程：**
```javascript
const Board = require('./Board');
const TweenManager = require('../utils/tween');

class MatchEngine {
  constructor() {
    this.board = new Board();
    this.tweens = new TweenManager();
    this.isProcessing = false;
    this.onMatchComplete = null;
    this.onTileMove = null;
  }

  init() {
    this.board.init();
    this.isProcessing = false;
  }

  // 玩家交换碎片
  async swap(tile1, tile2) {
    if (this.isProcessing) return false;
    this.isProcessing = true;

    // 执行交换动画
    this.board.swap(tile1, tile2);

    // 等待动画完成
    await this._waitForAnimations();

    // 检查是否有匹配
    const matches = this.board.findMatches();
    if (matches.length === 0) {
      // 无匹配，交换回来
      this.board.swap(tile1, tile2);
      await this._waitForAnimations();
      this.isProcessing = false;
      return false;
    }

    // 处理匹配
    await this._processMatches();

    this.isProcessing = false;
    return true;
  }

  // 处理匹配流程
  async _processMatches() {
    let matches = this.board.findMatches();

    while (matches.length > 0) {
      // 标记所有匹配的碎片
      this.board.markMatches(matches);

      // 触发匹配完成回调
      if (this.onMatchComplete) {
        this.onMatchComplete(matches);
      }

      // 等待消除动画
      await this._waitForAnimations();

      // 移除匹配的碎片
      this.board.removeMatches();

      // 下落填补
      const drops = this.board.dropTiles();
      if (this.onTileMove) {
        this.onTileMove(drops);
      }

      // 等待下落动画
      await this._waitForAnimations();

      // 检查新匹配（连消）
      matches = this.board.findMatches();
    }

    // 检查是否还有可移动的匹配
    if (!this.board.hasPossibleMoves()) {
      // 重新生成棋盘
      this.board.init();
    }
  }

  // 等待动画完成（简化：使用 delay）
  _waitForAnimations() {
    return new Promise(resolve => setTimeout(resolve, 200));
  }

  // 更新动画
  update() {
    this.tweens.update();
  }
}

module.exports = MatchEngine;
```

**Steps:**
- [ ] **Step 1: 创建 `core/MatchEngine.js`**
- [ ] **Step 2: Commit: "feat: MatchEngine 匹配判定引擎"**

---

#### Task 6: Game 主控制器

**Files:**
- Create: `core/Game.js`

**core/Game.js — 游戏状态机主控制器：**
```javascript
const { GAME_STATE, BOARD_SIZE, TILE_SIZE, TILE_GAP, COLORS } = require('../utils/constants');
const MatchEngine = require('./MatchEngine');
const UIManager = require('../ui/UIManager');
const LevelSystem = require('../systems/Level');
const Progress = require('../systems/Progress');
const Achievement = require('../systems/Achievement');
const AudioManager = require('../systems/Audio');
const AdManager = require('../systems/Ad');

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = GAME_STATE.BOOT;
    this.engine = new MatchEngine();
    this.ui = new UIManager(this);
    this.level = new LevelSystem();
    this.progress = new Progress();
    this.achievement = new Achievement();
    this.audio = new AudioManager();
    this.ad = new AdManager();

    // 游戏数据
    this.currentLevel = 1;
    this.score = 0;
    this.moves = 0;
    this.collectedFragments = [];

    // 触摸状态
    this.touchStart = null;
    this.selectedTile = null;

    this._init();
  }

  _init() {
    // 加载存档
    this.progress.load();

    // 绑定触摸事件
    this.canvas.onTouchStart = this._onTouchStart.bind(this);
    this.canvas.onTouchMove = this._onTouchMove.bind(this);
    this.canvas.onTouchEnd = this._onTouchEnd.bind(this);
  }

  // 开始游戏
  start() {
    this.state = GAME_STATE.MENU;
    this.ui.showMenu();
    this._gameLoop();
  }

  // 主循环
  _gameLoop() {
    const loop = () => {
      this.update();
      this.render();
      wx.requestAnimationFrame(loop);
    };
    wx.requestAnimationFrame(loop);
  }

  // 更新逻辑
  update() {
    this.engine.update();
    this.ui.update();
  }

  // 渲染
  render() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 渲染 UI
    this.ui.render(this.ctx);
  }

  // 进入关卡
  enterLevel(levelId) {
    this.currentLevel = levelId;
    this.level.loadLevel(levelId);
    this.engine.init();
    this.score = 0;
    this.moves = 0;
    this.collectedFragments = [];
    this.state = GAME_STATE.PLAYING;
    this.ui.showGame();
  }

  // 触摸开始
  _onTouchStart(e) {
    if (this.state !== GAME_STATE.PLAYING) return;
    const touch = e.touches[0];
    this.touchStart = { x: touch.clientX, y: touch.clientY };
    this.selectedTile = this._getTileAt(touch.clientX, touch.clientY);
  }

  // 触摸移动
  _onTouchMove(e) {
    if (this.state !== GAME_STATE.PLAYING || !this.touchStart) return;
    const touch = e.touches[0];
    const dx = touch.clientX - this.touchStart.x;
    const dy = touch.clientY - this.touchStart.y;
    const threshold = TILE_SIZE / 2;

    if (this.selectedTile && (Math.abs(dx) > threshold || Math.abs(dy) > threshold)) {
      // 确定滑动方向
      let targetRow = this.selectedTile.row;
      let targetCol = this.selectedTile.col;

      if (Math.abs(dx) > Math.abs(dy)) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }

      const targetTile = this.engine.board.getTile(targetRow, targetCol);
      if (targetTile) {
        this.engine.swap(this.selectedTile, targetTile);
        this.audio.playSwap();
      }

      this.touchStart = null;
      this.selectedTile = null;
    }
  }

  // 触摸结束
  _onTouchEnd(e) {
    this.touchStart = null;
    this.selectedTile = null;
  }

  // 获取触摸位置的碎片
  _getTileAt(x, y) {
    const boardX = (this.canvas.width - BOARD_SIZE * (TILE_SIZE + TILE_GAP)) / 2;
    const boardY = 120;
    const col = Math.floor((x - boardX) / (TILE_SIZE + TILE_GAP));
    const row = Math.floor((y - boardY) / (TILE_SIZE + TILE_GAP));
    return this.engine.board.getTile(row, col);
  }

  // 关卡完成
  completeLevel() {
    this.state = GAME_STATE.RESULT;
    // 更新进度
    this.progress.completeLevel(this.currentLevel);
    // 检查成就
    this.achievement.checkAll(this);
    // 显示结算
    this.ui.showResult(this.collectedFragments);
    this.audio.playWin();
  }

  // 获取棋盘渲染偏移
  getBoardOffset() {
    const boardWidth = BOARD_SIZE * (TILE_SIZE + TILE_GAP);
    return {
      x: (this.canvas.width - boardWidth) / 2,
      y: 120,
    };
  }
}

module.exports = Game;
```

**Steps:**
- [ ] **Step 1: 创建 `core/Game.js`**
- [ ] **Step 2: Commit: "feat: Game 主控制器"**

---

### 阶段三：UI 系统

#### Task 7: UIManager UI 层级管理

**Files:**
- Create: `ui/UIManager.js`

**ui/UIManager.js：**
```javascript
const { GAME_STATE, COLORS, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');
const BootScreen = require('./BootScreen');
const MainMenu = require('./MainMenu');
const LevelSelect = require('./LevelSelect');
const GameView = require('./GameView');
const HUD = require('./HUD');
const ResultPopup = require('./ResultPopup');
const Gallery = require('./Gallery');
const Report = require('./Report');

class UIManager {
  constructor(game) {
    this.game = game;
    this.screens = {
      boot: new BootScreen(this),
      menu: new MainMenu(this),
      levelSelect: new LevelSelect(this),
      gameView: new GameView(this),
      hud: new HUD(this),
      result: new ResultPopup(this),
      gallery: new Gallery(this),
      report: new Report(this),
    };
    this.currentScreen = null;
    this.screenStack = [];
  }

  showBoot() {
    this.currentScreen = 'boot';
    this.screens.boot.show();
  }

  showMenu() {
    this.currentScreen = 'menu';
    this.screens.menu.show();
  }

  showLevelSelect() {
    this.currentScreen = 'levelSelect';
    this.screens.levelSelect.show();
  }

  showGame() {
    this.currentScreen = 'gameView';
    this.screens.gameView.show();
    this.screens.hud.show();
  }

  hideGame() {
    this.screens.gameView.hide();
    this.screens.hud.hide();
  }

  showResult(fragments) {
    this.screens.result.show(fragments);
  }

  showGallery() {
    this.currentScreen = 'gallery';
    this.screens.gallery.show();
  }

  showReport() {
    this.currentScreen = 'report';
    this.screens.report.show();
  }

  update() {
    if (this.screens[this.currentScreen]) {
      this.screens[this.currentScreen].update?.();
    }
  }

  render(ctx) {
    if (this.screens[this.currentScreen]) {
      this.screens[this.currentScreen].render?.(ctx);
    }
  }

  // 统一的按钮点击检测
  isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }
}

module.exports = UIManager;
```

**Steps:**
- [ ] **Step 1: 创建 `ui/UIManager.js`**
- [ ] **Step 2: Commit: "feat: UIManager UI 层级管理"**

---

#### Task 8: 游戏界面组件

**Files:**
- Create: `ui/BootScreen.js`
- Create: `ui/MainMenu.js`
- Create: `ui/LevelSelect.js`
- Create: `ui/GameView.js`
- Create: `ui/HUD.js`
- Create: `ui/ResultPopup.js`
- Create: `ui/Gallery.js`
- Create: `ui/Report.js`

**ui/BootScreen.js — 启动页：**
```javascript
class BootScreen {
  constructor(uiManager) {
    this.ui = uiManager;
    this.alpha = 0;
    this.done = false;
  }

  show() {
    this.alpha = 0;
    this.done = false;
    // 淡入动画
    const fadeIn = () => {
      this.alpha += 0.02;
      if (this.alpha >= 1) {
        this.alpha = 1;
        setTimeout(() => {
          this.ui.showMenu();
        }, 500);
        return;
      }
      setTimeout(fadeIn, 16);
    };
    fadeIn();
  }

  render(ctx) {
    const { GAME_WIDTH, GAME_HEIGHT, COLORS } = require('../utils/constants');
    const { GAME_WIDTH: w, GAME_HEIGHT: h } = { GAME_WIDTH: ctx.canvas?.width || 375, GAME_HEIGHT: ctx.canvas?.height || 667 };

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Logo 文字
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('人生拾光', w / 2, h / 2 - 30);

    // 标语
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.fillText('拾光筑梦，不负韶华', w / 2, h / 2 + 10);

    ctx.globalAlpha = 1;
  }
}

module.exports = BootScreen;
```

**ui/MainMenu.js — 主菜单：**
```javascript
const { COLORS, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');

class MainMenu {
  constructor(uiManager) {
    this.ui = uiManager;
    this.buttons = [];
    this._createButtons();
  }

  _createButtons() {
    const w = GAME_WIDTH;
    this.buttons = [
      { text: '开始游戏', x: w / 2 - 80, y: 200, width: 160, height: 50, action: 'startGame' },
      { text: '关卡选择', x: w / 2 - 80, y: 270, width: 160, height: 50, action: 'levelSelect' },
      { text: '成长图鉴', x: w / 2 - 80, y: 340, width: 160, height: 50, action: 'gallery' },
      { text: '音效设置', x: w / 2 - 80, y: 410, width: 160, height: 50, action: 'settings' },
    ];
  }

  show() {
    this._createButtons();
  }

  handleClick(x, y) {
    for (const btn of this.buttons) {
      if (this.ui.isPointInRect(x, y, btn)) {
        this.ui.game.audio.playClick();
        switch (btn.action) {
          case 'startGame':
            // 从已解锁关卡开始
            const currentLevel = this.ui.game.progress.getCurrentLevel();
            this.ui.game.enterLevel(currentLevel);
            break;
          case 'levelSelect':
            this.ui.showLevelSelect();
            break;
          case 'gallery':
            this.ui.showGallery();
            break;
          case 'settings':
            this._toggleSound();
            break;
        }
        return true;
      }
    }
    return false;
  }

  _toggleSound() {
    const settings = this.ui.game.progress.getSettings();
    settings.sound = !settings.sound;
    this.ui.game.progress.saveSettings(settings);
  }

  render(ctx) {
    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 标题
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('人生拾光', w / 2, 100);

    // 按钮
    for (const btn of this.buttons) {
      // 按钮背景
      ctx.fillStyle = COLORS.PRIMARY;
      ctx.beginPath();
      this._roundRect(ctx, btn.x, btn.y, btn.width, btn.height, 12);
      ctx.fill();

      // 按钮文字
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText(btn.text, btn.x + btn.width / 2, btn.y + btn.height / 2 + 5);
    }

    // 底部标语
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    ctx.fillText('每一步成长，都值得被珍藏', w / 2, h - 50);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

module.exports = MainMenu;
```

**ui/LevelSelect.js — 关卡选择（卡片式）：**
```javascript
const { COLORS, GAME_WIDTH, GAME_HEIGHT, LEVEL_STAGES } = require('../utils/constants');

class LevelSelect {
  constructor(uiManager) {
    this.ui = uiManager;
    this.selectedStage = null;
  }

  show() {
    this.selectedStage = null;
  }

  handleClick(x, y) {
    // 返回按钮
    if (x < 50 && y < 50) {
      this.ui.game.audio.playClick();
      this.ui.showMenu();
      return true;
    }

    // 关卡卡片
    const stages = Object.values(LEVEL_STAGES);
    let cardY = 80;
    for (const stage of stages) {
      for (const levelId of stage.levels) {
        const cardX = GAME_WIDTH / 2 - 45;
        const cardW = 90;
        const cardH = 90;
        if (x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH) {
          const isUnlocked = this.ui.game.progress.isLevelUnlocked(levelId);
          if (isUnlocked) {
            this.ui.game.audio.playClick();
            this.ui.game.enterLevel(levelId);
            return true;
          }
        }
        cardY += cardH + 10;
      }
      cardY += 20;
    }
    return false;
  }

  render(ctx) {
    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 返回按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('< 返回', 20, 35);

    // 标题
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择关卡', w / 2, 40);

    // 关卡卡片
    const stages = Object.values(LEVEL_STAGES);
    let cardY = 80;
    for (const stage of stages) {
      // 阶段标题
      ctx.fillStyle = COLORS.SECONDARY;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(stage.name, 20, cardY + 15);

      cardY += 25;

      for (const levelId of stage.levels) {
        const cardX = w / 2 - 40;
        const cardW = 80;
        const cardH = 70;
        const isUnlocked = this.ui.game.progress.isLevelUnlocked(levelId);

        // 卡片背景
        ctx.fillStyle = isUnlocked ? COLORS.PRIMARY : '#CCCCCC';
        ctx.beginPath();
        this._roundRect(ctx, cardX, cardY, cardW, cardH, 10);
        ctx.fill();

        // 关卡号
        ctx.fillStyle = isUnlocked ? '#FFFFFF' : '#999999';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(levelId.toString(), cardX + cardW / 2, cardY + cardH / 2 - 5);

        // 关卡名称
        ctx.font = '10px sans-serif';
        ctx.fillText(`关卡 ${levelId}`, cardX + cardW / 2, cardY + cardH / 2 + 15);

        // 未解锁图标
        if (!isUnlocked) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillText('🔒', cardX + cardW / 2, cardY + cardH / 2 + 5);
        }

        cardY += cardH + 10;
      }
      cardY += 20;
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

module.exports = LevelSelect;
```

**ui/GameView.js — 游戏主视图（棋盘渲染）：**
```javascript
const { COLORS, BOARD_SIZE, TILE_SIZE, TILE_GAP, GAME_WIDTH, TILE_TYPES } = require('../utils/constants');

class GameView {
  constructor(uiManager) {
    this.ui = uiManager;
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  render(ctx) {
    if (!this.visible) return;

    const w = ctx.canvas?.width || GAME_WIDTH;
    const offset = this.ui.game.getBoardOffset();
    const board = this.ui.game.engine.board;

    // 棋盘背景
    const boardW = BOARD_SIZE * (TILE_SIZE + TILE_GAP);
    const boardH = BOARD_SIZE * (TILE_SIZE + TILE_GAP);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    this._roundRect(ctx, offset.x - 10, offset.y - 10, boardW + 20, boardH + 20, 16);
    ctx.fill();

    // 绘制碎片
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = board.getTile(row, col);
        if (tile && !tile.isMatched) {
          this._drawTile(ctx, tile, offset);
        }
      }
    }
  }

  _drawTile(ctx, tile, offset) {
    const x = offset.x + tile.col * (TILE_SIZE + TILE_GAP);
    const y = offset.y + tile.row * (TILE_SIZE + TILE_GAP);
    const color = TILE_TYPES[tile.type]?.color || '#CCCCCC';

    // 碎片圆形背景
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // 高光效果
    const gradient = ctx.createRadialGradient(
      x + TILE_SIZE / 2 - 5, y + TILE_SIZE / 2 - 5, 0,
      x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

module.exports = GameView;
```

**ui/HUD.js — 游戏内信息栏：**
```javascript
const { COLORS, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');

class HUD {
  constructor(uiManager) {
    this.ui = uiManager;
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  handleClick(x, y) {
    // 暂停按钮
    if (x >= GAME_WIDTH - 50 && x <= GAME_WIDTH - 10 && y >= 15 && y <= 45) {
      this.ui.game.audio.playClick();
      // 暂停逻辑
      return true;
    }
    return false;
  }

  render(ctx) {
    if (!this.visible) return;

    // 顶部信息栏背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, GAME_WIDTH, 60);

    // 关卡信息
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`关卡 ${this.ui.game.currentLevel}`, 20, 35);

    // 分数
    ctx.textAlign = 'center';
    ctx.fillText(`分数: ${this.ui.game.score}`, GAME_WIDTH / 2, 35);

    // 暂停按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⏸', GAME_WIDTH - 20, 35);
  }
}

module.exports = HUD;
```

**ui/ResultPopup.js — 结算弹窗：**
```javascript
const { COLORS, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');

class ResultPopup {
  constructor(uiManager) {
    this.ui = uiManager;
    this.visible = false;
    this.fragments = [];
  }

  show(fragments) {
    this.visible = true;
    this.fragments = fragments;
  }

  hide() {
    this.visible = false;
  }

  handleClick(x, y) {
    if (!this.visible) return false;

    // 激励视频按钮
    if (x >= 50 && x <= GAME_WIDTH - 50 && y >= 320 && y <= 370) {
      this.ui.game.audio.playClick();
      this.ui.game.ad.showRewardedVideo(() => {
        // 双倍奖励
        this.fragments.forEach(f => f.count *= 2);
        this._showDoubleReward();
      });
      return true;
    }

    // 继续按钮
    if (x >= 50 && x <= GAME_WIDTH - 50 && y >= 390 && y <= 440) {
      this.ui.game.audio.playClick();
      this.hide();
      this.ui.showLevelSelect();
      return true;
    }

    return false;
  }

  _showDoubleReward() {
    // 显示双倍获得提示
    this.showDouble = true;
  }

  render(ctx) {
    if (!this.visible) return;

    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // 弹窗背景
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    this._roundRect(ctx, 30, 100, w - 60, h - 200, 20);
    ctx.fill();

    // 标题
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('恭喜过关!', w / 2, 150);

    // 获得碎片展示
    let fragY = 200;
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = '14px sans-serif';
    ctx.fillText('获得时光碎片', w / 2, fragY);
    fragY += 30;

    for (const frag of this.fragments) {
      ctx.fillStyle = frag.color;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${frag.name} x${frag.count}`, w / 2 - 50, fragY);
      fragY += 25;
    }

    // 激励视频按钮
    ctx.fillStyle = COLORS.ACCENT;
    ctx.beginPath();
    this._roundRect(ctx, 50, 320, w - 100, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎬 观看视频领取双倍碎片', w / 2, 352);

    // 继续按钮
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.beginPath();
    this._roundRect(ctx, 50, 390, w - 100, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('继续', w / 2, 422);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

module.exports = ResultPopup;
```

**ui/Gallery.js — 成长图鉴：**
```javascript
const { COLORS, GAME_WIDTH, GAME_HEIGHT, TILE_TYPES } = require('../utils/constants');

class Gallery {
  constructor(uiManager) {
    this.ui = uiManager;
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  handleClick(x, y) {
    // 返回按钮
    if (x < 50 && y < 50) {
      this.ui.game.audio.playClick();
      this.hide();
      this.ui.showMenu();
      return true;
    }
    return false;
  }

  render(ctx) {
    if (!this.visible) return;

    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 返回按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('< 返回', 20, 35);

    // 标题
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('成长图鉴', w / 2, 40);

    // 碎片展示
    const types = Object.values(TILE_TYPES);
    let index = 0;
    for (const type of types) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 40 + col * 100;
      const y = 80 + row * 100;

      const collected = this.ui.game.progress.getFragmentCount(type.id);

      // 碎片圆形
      ctx.fillStyle = collected > 0 ? type.color : '#E0E0E0';
      ctx.beginPath();
      ctx.arc(x + 30, y + 30, 25, 0, Math.PI * 2);
      ctx.fill();

      // 碎片数量
      ctx.fillStyle = collected > 0 ? '#FFFFFF' : '#999999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`x${collected}`, x + 30, y + 55);

      // 碎片名称
      ctx.fillStyle = COLORS.TEXT_PRIMARY;
      ctx.font = '10px sans-serif';
      ctx.fillText(type.name.split('·')[1] || type.name, x + 30, y + 75);

      index++;
    }

    // 成就墙
    ctx.fillStyle = COLORS.SECONDARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('成就', 30, 320);

    const achievements = this.ui.game.achievement.getAll();
    let achY = 350;
    for (const ach of achievements) {
      const unlocked = this.ui.game.progress.isAchievementUnlocked(ach.id);
      ctx.fillStyle = unlocked ? COLORS.PRIMARY : '#CCCCCC';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${unlocked ? '🏆' : '🔒'} ${ach.name}`, 30, achY);
      achY += 30;
    }
  }
}

module.exports = Gallery;
```

**ui/Report.js — 成长报告：**
```javascript
const { COLORS, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');

class Report {
  constructor(uiManager) {
    this.ui = uiManager;
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  handleClick(x, y) {
    if (!this.visible) return false;

    // 分享按钮
    if (x >= 50 && x <= GAME_WIDTH - 50 && y >= 400 && y <= 450) {
      this.ui.game.audio.playClick();
      // 微信分享
      wx.shareAppMessage({
        title: '人生拾光 - 成长报告',
        imageUrl: '...', // 分享图片
      });
      return true;
    }

    // 返回
    if (x >= 50 && x <= GAME_WIDTH - 50 && y >= 470 && y <= 520) {
      this.ui.game.audio.playClick();
      this.hide();
      this.ui.showMenu();
      return true;
    }

    return false;
  }

  render(ctx) {
    if (!this.visible) return;

    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.PRIMARY);
    gradient.addColorStop(1, COLORS.ACCENT);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('成长报告', w / 2, 80);

    // 统计信息
    ctx.font = '16px sans-serif';
    const stats = this.ui.game.progress.getStats();
    ctx.fillText(`收集碎片: ${stats.totalFragments}`, w / 2, 150);
    ctx.fillText(`通关关卡: ${stats.completedLevels}/12`, w / 2, 180);
    ctx.fillText(`解锁成就: ${stats.unlockedAchievements}/${stats.totalAchievements}`, w / 2, 210);

    // 寄语
    ctx.font = '14px sans-serif';
    ctx.fillText('你的人生，满是光芒', w / 2, 260);
    ctx.font = '12px sans-serif';
    ctx.fillText('每一步成长，都值得被珍藏', w / 2, 285);

    // 分享按钮
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    this._roundRect(ctx, 50, 400, w - 100, 50, 12);
    ctx.fill();
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = '14px sans-serif';
    ctx.fillText('分享给好友', w / 2, 432);

    // 返回按钮
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    this._roundRect(ctx, 50, 470, w - 100, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.fillText('返回主菜单', w / 2, 502);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

module.exports = Report;
```

**Steps:**
- [ ] **Step 1: 创建 `ui/BootScreen.js`**
- [ ] **Step 2: 创建 `ui/MainMenu.js`**
- [ ] **Step 3: 创建 `ui/LevelSelect.js`**
- [ ] **Step 4: 创建 `ui/GameView.js`**
- [ ] **Step 5: 创建 `ui/HUD.js`**
- [ ] **Step 6: 创建 `ui/ResultPopup.js`**
- [ ] **Step 7: 创建 `ui/Gallery.js`**
- [ ] **Step 8: 创建 `ui/Report.js`**
- [ ] **Step 9: Commit: "feat: UI 界面组件"**

---

### 阶段四：系统层

#### Task 9: Level 关卡系统

**Files:**
- Create: `systems/Level.js`
- Create: `levels/level_1.json` ~ `levels/level_12.json`

**systems/Level.js：**
```javascript
const LEVEL_STAGES = require('../utils/constants').LEVEL_STAGES;

class LevelSystem {
  constructor() {
    this.currentLevel = 1;
    this.levelConfig = null;
  }

  loadLevel(levelId) {
    this.currentLevel = levelId;
    try {
      this.levelConfig = require(`../levels/level_${levelId}.json`);
    } catch (e) {
      // 默认配置
      this.levelConfig = this._getDefaultConfig(levelId);
    }
    return this.levelConfig;
  }

  _getDefaultConfig(levelId) {
    // 根据关卡ID生成默认配置
    const baseScore = 1000 + (levelId - 1) * 500;
    const moves = 20 + Math.floor(levelId / 2);
    return {
      id: levelId,
      name: `关卡 ${levelId}`,
      targetScore: baseScore,
      maxMoves: moves,
      requiredTypes: ['green', 'orange', 'blue', 'pink', 'gold'].slice(0, 3 + Math.floor(levelId / 4)),
      collectFragment: this._getFragmentType(levelId),
    };
  }

  _getFragmentType(levelId) {
    const types = ['green', 'orange', 'blue', 'pink', 'gold'];
    return types[Math.floor((levelId - 1) / 3) % types.length];
  }

  getTargetScore() {
    return this.levelConfig?.targetScore || 1000;
  }

  getMaxMoves() {
    return this.levelConfig?.maxMoves || 20;
  }

  getRequiredTypes() {
    return this.levelConfig?.requiredTypes || ['green', 'orange', 'blue'];
  }

  getStage() {
    for (const stage of Object.values(LEVEL_STAGES)) {
      if (stage.levels.includes(this.currentLevel)) {
        return stage;
      }
    }
    return null;
  }
}

module.exports = LevelSystem;
```

**示例关卡配置 `levels/level_1.json`：**
```json
{
  "id": 1,
  "name": "童年启航",
  "stage": "childhood",
  "targetScore": 1000,
  "maxMoves": 20,
  "requiredTypes": ["green", "orange", "blue"],
  "collectFragment": "green",
  "description": "童年的第一道光"
}
```

**Steps:**
- [ ] **Step 1: 创建 `systems/Level.js`**
- [ ] **Step 2: 创建 `levels/level_1.json` ~ `levels/level_12.json`（共12个关卡配置）**
- [ ] **Step 3: Commit: "feat: Level 关卡系统"**

---

#### Task 10: Progress 存档系统

**Files:**
- Create: `systems/Progress.js`

**systems/Progress.js：**
```javascript
const { Storage, STORAGE_KEYS } = require('../utils/storage');
const { TILE_TYPE_KEYS } = require('../utils/constants');

class Progress {
  constructor() {
    this.storage = new Storage();
    this.data = {
      progress: { currentLevel: 1, unlockedLevels: [1], completedLevels: [] },
      fragments: {},
      achievements: {},
      settings: { sound: true, music: true },
    };
  }

  load() {
    this.data.progress = this.storage.get(STORAGE_KEYS.PROGRESS, this.data.progress);
    this.data.fragments = this.storage.get(STORAGE_KEYS.FRAGMENTS, this._initFragments());
    this.data.achievements = this.storage.get(STORAGE_KEYS.ACHIEVEMENTS, {});
    this.data.settings = this.storage.get(STORAGE_KEYS.SETTINGS, this.data.settings);
  }

  _initFragments() {
    const fragments = {};
    for (const type of TILE_TYPE_KEYS) {
      fragments[type] = 0;
    }
    return fragments;
  }

  save() {
    this.storage.set(STORAGE_KEYS.PROGRESS, this.data.progress);
    this.storage.set(STORAGE_KEYS.FRAGMENTS, this.data.fragments);
    this.storage.set(STORAGE_KEYS.ACHIEVEMENTS, this.data.achievements);
    this.storage.set(STORAGE_KEYS.SETTINGS, this.data.settings);
  }

  // 关卡进度
  getCurrentLevel() {
    return this.data.progress.currentLevel;
  }

  isLevelUnlocked(levelId) {
    return this.data.progress.unlockedLevels.includes(levelId);
  }

  completeLevel(levelId) {
    // 标记完成
    if (!this.data.progress.completedLevels.includes(levelId)) {
      this.data.progress.completedLevels.push(levelId);
    }
    // 解锁下一关
    const nextLevel = levelId + 1;
    if (nextLevel <= 12 && !this.data.progress.unlockedLevels.includes(nextLevel)) {
      this.data.progress.unlockedLevels.push(nextLevel);
    }
    // 更新当前关卡
    this.data.progress.currentLevel = nextLevel <= 12 ? nextLevel : levelId;
    this.save();
  }

  // 碎片收集
  addFragment(type, count = 1) {
    if (!this.data.fragments[type]) {
      this.data.fragments[type] = 0;
    }
    this.data.fragments[type] += count;
    this.save();
  }

  getFragmentCount(type) {
    return this.data.fragments[type] || 0;
  }

  // 成就
  unlockAchievement(id) {
    this.data.achievements[id] = true;
    this.save();
  }

  isAchievementUnlocked(id) {
    return this.data.achievements[id] || false;
  }

  // 设置
  getSettings() {
    return this.data.settings;
  }

  saveSettings(settings) {
    this.data.settings = settings;
    this.save();
  }

  // 统计
  getStats() {
    const totalFragments = Object.values(this.data.fragments).reduce((a, b) => a + b, 0);
    const unlockedAchievements = Object.values(this.data.achievements).filter(Boolean).length;
    return {
      totalFragments,
      completedLevels: this.data.progress.completedLevels.length,
      unlockedAchievements,
      totalAchievements: 4,
    };
  }

  // 重置（调试用）
  reset() {
    this.data = {
      progress: { currentLevel: 1, unlockedLevels: [1], completedLevels: [] },
      fragments: this._initFragments(),
      achievements: {},
      settings: { sound: true, music: true },
    };
    this.save();
  }
}

module.exports = Progress;
```

**Steps:**
- [ ] **Step 1: 创建 `systems/Progress.js`**
- [ ] **Step 2: Commit: "feat: Progress 存档系统"**

---

#### Task 11: Achievement 成就系统

**Files:**
- Create: `systems/Achievement.js`

**systems/Achievement.js：**
```javascript
class AchievementSystem {
  constructor() {
    this.achievements = [
      {
        id: '启蒙者',
        name: '启蒙者',
        description: '通关童年启蒙阶段',
        condition: (game) => {
          const completed = game.progress.data.progress.completedLevels;
          return completed.includes(1) && completed.includes(2) && completed.includes(3);
        },
      },
      {
        id: '成长达人',
        name: '成长达人',
        description: '通关成长突破阶段',
        condition: (game) => {
          const completed = game.progress.data.progress.completedLevels;
          return completed.includes(4) && completed.includes(5) && completed.includes(6);
        },
      },
      {
        id: '幸福守护者',
        name: '幸福守护者',
        description: '通关温情相守阶段',
        condition: (game) => {
          const completed = game.progress.data.progress.completedLevels;
          return completed.includes(7) && completed.includes(8) && completed.includes(9);
        },
      },
      {
        id: '圆满逐光者',
        name: '圆满逐光者',
        description: '通关全部关卡',
        condition: (game) => {
          const completed = game.progress.data.progress.completedLevels;
          return completed.length === 12;
        },
      },
    ];
  }

  getAll() {
    return this.achievements;
  }

  get(id) {
    return this.achievements.find(a => a.id === id);
  }

  checkAll(game) {
    const newlyUnlocked = [];
    for (const ach of this.achievements) {
      if (!game.progress.isAchievementUnlocked(ach.id) && ach.condition(game)) {
        game.progress.unlockAchievement(ach.id);
        newlyUnlocked.push(ach);
      }
    }
    return newlyUnlocked;
  }
}

module.exports = AchievementSystem;
```

**Steps:**
- [ ] **Step 1: 创建 `systems/Achievement.js`**
- [ ] **Step 2: Commit: "feat: Achievement 成就系统"**

---

#### Task 12: Audio 音效系统

**Files:**
- Create: `systems/Audio.js`

**systems/Audio.js：**
```javascript
class AudioManager {
  constructor() {
    this.sounds = {};
    this.music = null;
    this.enabled = true;
  }

  init() {
    // 微信音频上下文
    this.bgm = wx.createInnerAudioContext();
    this.bgm.loop = true;
    this.bgm.volume = 0.3;
  }

  playClick() {
    this._playSound('click');
  }

  playSwap() {
    this._playSound('swap');
  }

  playMatch() {
    this._playSound('match');
  }

  playWin() {
    this._playSound('win');
  }

  _playSound(name) {
    if (!this.enabled) return;
    // 实际项目需要预加载音频文件
    // const sound = this.sounds[name];
    // if (sound) sound.play();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.bgm?.pause();
    } else {
      this.bgm?.play();
    }
  }

  playBGM() {
    this.init();
    // this.bgm.src = 'assets/audio/bgm.mp3';
    // this.bgm.play();
  }
}

module.exports = AudioManager;
```

**Steps:**
- [ ] **Step 1: 创建 `systems/Audio.js`**
- [ ] **Step 2: Commit: "feat: Audio 音效系统"**

---

#### Task 13: Ad 广告系统

**Files:**
- Create: `systems/Ad.js`

**systems/Ad.js：**
```javascript
class AdManager {
  constructor() {
    this.rewardedVideoAd = null;
    this.interstitialAd = null;
    this.lastInterstitialTime = 0;
    this.REWARDED_VIDEO_AD_UNIT_ID = 'adunit-xxxxxx'; // 替换为实际广告位ID
    this.INTERSTITIAL_AD_UNIT_ID = 'adunit-xxxxxx';   // 替换为实际广告位ID
  }

  init() {
    // 激励视频广告
    this.rewardedVideoAd = wx.createRewardedVideoAd({
      adUnitId: this.REWARDED_VIDEO_AD_UNIT_ID,
    });
    this.rewardedVideoAd.onClose((res) => {
      if (res.isEnded) {
        this.onRewardedVideoComplete?.();
      }
    });

    // 插屏广告
    this.interstitialAd = wx.createInterstitialAd({
      adUnitId: this.INTERSTITIAL_AD_UNIT_ID,
    });
  }

  showRewardedVideo(onComplete, onError) {
    if (!this.rewardedVideoAd) {
      onError?.();
      return;
    }
    this.onRewardedVideoComplete = onComplete;
    this.rewardedVideoAd.load()
      .then(() => this.rewardedVideoAd.show())
      .catch(() => onError?.());
  }

  showInterstitial() {
    // 60秒冷却
    const now = Date.now();
    if (now - this.lastInterstitialTime < 60000) return;

    if (this.interstitialAd) {
      this.interstitialAd.show()
        .then(() => {
          this.lastInterstitialTime = now;
        })
        .catch(() => {});
    }
  }
}

module.exports = AdManager;
```

**Steps:**
- [ ] **Step 1: 创建 `systems/Ad.js`**
- [ ] **Step 2: Commit: "feat: Ad 广告系统"**

---

### 阶段五：入口与集成

#### Task 14: 游戏主入口

**Files:**
- Create: `game.js`（项目根目录）

**game.js：**
```javascript
// 人生拾光 - 微信小游戏主入口
const Game = require('./core/Game');
const wxAdapter = require('./wechatgame/game');

// 等待微信环境就绪
function startGame() {
  // 获取游戏画布（微信小游戏使用 canvas）
  const query = wx.createSelectorQuery();
  query.select('#gameCanvas')
    .fields({ node: true, size: true })
    .exec((res) => {
      const canvas = res[0]?.node;
      if (!canvas) {
        console.error('Canvas not found');
        return;
      }

      // 设置画布尺寸
      canvas.width = 375;
      canvas.height = 667;

      // 初始化并启动游戏
      const game = new Game(canvas);
      game.start();
    });
}

// 微信小游戏环境检查
if (typeof wx !== 'undefined') {
  // 监听加载完成
  wx.onLoad?.(() => {
    startGame();
  });
} else {
  // 浏览器调试环境
  window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.width = 375;
      canvas.height = 667;
      const game = new Game(canvas);
      game.start();
    }
  };
}
```

**Steps:**
- [ ] **Step 1: 创建 `game.js` 主入口**
- [ ] **Step 2: Commit: "feat: 游戏主入口"**

---

#### Task 15: 微信适配层完善

**Files:**
- Create: `wechatgame/game.js`（完善适配层）

**说明：** 微信小游戏的入口文件和适配层需要与微信开发者工具配合使用。当前 `wechatgame/game.js` 提供 API 适配，真正的启动入口在微信开发者工具中配置。

**Steps:**
- [ ] **Step 1: 完善 `wechatgame/game.js` 适配层（确保所有 wx API 正确桥接）**
- [ ] **Step 2: Commit: "feat: 微信适配层完善"**

---

## 开发验收标准

每个 Task 完成后需验证：

1. **代码编译通过** — 无语法错误
2. **模块加载正常** — require/import 无报错
3. **功能自测** — 对应交互可正常运行
4. **Commit 提交** — 每个 Task 单独提交，描述清晰

---

## 整体验收标准

阶段完成后需验证：

- [ ] 微信开发者工具可正常打开项目
- [ ] 启动页正常显示并过渡到主菜单
- [ ] 主菜单按钮可正常切换界面
- [ ] 关卡选择显示 12 个关卡，解锁状态正确
- [ ] 进入关卡后棋盘正常渲染 6×6 碎片
- [ ] 滑动交换碎片可正常触发匹配消除
- [ ] 关卡通关后显示结算弹窗
- [ ] 碎片收集、成就解锁数据正确存档
- [ ] 成长图鉴正确显示收集进度
- [ ] 广告系统正确接入（需配置真实广告位ID）

---

**Plan 编制完成。执行方式选择：**

**1. Subagent-Driven（推荐）** — 每个 Task 由独立 subagent 执行，任务间有检查点

**2. Inline Execution** — 当前 session 批量执行，带检查点

选择哪种方式？