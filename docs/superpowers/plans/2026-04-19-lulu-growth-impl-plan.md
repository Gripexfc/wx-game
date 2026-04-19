# 《噜噜陪你成长》微信小游戏实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一款治愈养成微信小游戏，玩家通过完成每日任务让水豚噜噜成长

**Architecture:** 状态机驱动的游戏主循环，Canvas绘制噜噜和UI，本地存储持久化存档，模块化结构便于维护

**Tech Stack:** 微信原生 Canvas API + JavaScript (ES6+)，无第三方框架

---

## 项目文件结构

```
/wx-game
├── game.js                    # 游戏主入口
├── game.json                 # 微信小游戏配置
├── project.config.json       # 项目配置
├── js/
│   ├── main.js              # 游戏主控制器
│   ├── Lulu.js             # 噜噜角色类
│   ├── TaskManager.js       # 任务管理系统
│   ├── GrowthSystem.js      # 成长/XP系统
│   ├── Storage.js           # 本地存储封装
│   └── ui/
│       ├── HomePage.js      # 首页（噜噜展示）
│       ├── TaskPage.js      # 任务页
│       ├── GalleryPage.js   # 图鉴页
│       └── AchievementPage.js # 成就页
├── utils/
│   └── constants.js         # 游戏常量
└── assets/
    └── images/             # 图片资源
```

---

## 阶段一：项目脚手架

### Task 1: 项目配置文件

**Files:**
- Modify: `game.json`
- Modify: `project.config.json`
- Modify: `game.js`
- Modify: `js/render.js`

**Steps:**

- [ ] **Step 1: 更新 `game.json`**

```json
{
  "deviceOrientation": "portrait",
  "showStatusBar": false
}
```

- [ ] **Step 2: 更新 `project.config.json`**

```json
{
  "description": "项目配置文件",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "postcss": false,
    "minified": true,
    "newFeature": true,
    "enhance": false
  },
  "compileType": "game",
  "libVersion": "latest",
  "appid": "wxb9bccf507718cc64",
  "projectname": "lulu-growth"
}
```

- [ ] **Step 3: 更新 `game.js`**

```javascript
import Main from './js/main';

new Main();
```

- [ ] **Step 4: 确认 `js/render.js` 内容**

```javascript
// Canvas 初始化
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 项目脚手架配置"
```

---

### Task 2: 常量定义

**Files:**
- Create: `utils/constants.js`

**Steps:**

- [ ] **Step 1: 创建 `utils/constants.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add utils/constants.js
git commit -m "feat: 常量定义"
```

---

## 阶段二：存储与数据层

### Task 3: 本地存储封装

**Files:**
- Create: `js/Storage.js`

**Steps:**

- [ ] **Step 1: 创建 `js/Storage.js`**

```javascript
const { STORAGE_KEYS } = require('../utils/constants');

class Storage {
  constructor() {
    this.cache = {};
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

  set(key, value) {
    const jsonStr = JSON.stringify(value);
    try {
      wx.setStorageSync(key, jsonStr);
      this.cache[key] = value;
    } catch (e) {
      console.error('Storage set error:', e);
    }
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

module.exports = Storage;
```

- [ ] **Step 2: Commit**

```bash
git add js/Storage.js
git commit -m "feat: 本地存储封装"
```

---

## 阶段三：噜噜角色

### Task 4: 噜噜角色类

**Files:**
- Create: `js/Lulu.js`

**Steps:**

- [ ] **Step 1: 创建 `js/Lulu.js`**

```javascript
const { LULU_STAGES, LULU_ACTIONS, COLORS } = require('../utils/constants');

class Lulu {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.stage = LULU_STAGES.BABY;
    this.accessories = [];
    this.action = null;
    this.actionTimer = 0;
    this.animTimer = 0;
    this.breatheOffset = 0;
  }

  // 获取当前阶段
  getStage() {
    const level = this.level;
    if (level >= 16) return LULU_STAGES.ADULT;
    if (level >= 11) return LULU_STAGES.YOUTH;
    if (level >= 6) return LULU_STAGES.CHILD;
    return LULU_STAGES.BABY;
  }

  // 获取噜噜尺寸（根据阶段）
  getSize() {
    const stage = this.getStage();
    switch (stage.id) {
      case 'adult': return 180;
      case 'youth': return 150;
      case 'child': return 120;
      default: return 90;
    }
  }

  // 随机触发动作
  triggerRandomAction() {
    const action = LULU_ACTIONS[Math.floor(Math.random() * LULU_ACTIONS.length)];
    this.action = action;
    this.actionTimer = 60; // 动作持续帧数
  }

  // 获取动作描述
  getActionText() {
    switch (this.action) {
      case '摇头': return '(´・ω・`)ノ';
      case '微笑': return '(｡◕‿◕｡)';
      case '蹭蹭': return '(◕ᴗ◕✿)';
      case '蹦跳': return '(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧';
      case '打哈欠': return '(๑・ω-)〜♦';
      default: return '(●´∀`)';
    }
  }

  // 更新动画
  update() {
    this.animTimer++;
    this.breatheOffset = Math.sin(this.animTimer * 0.05) * 3;
    
    if (this.actionTimer > 0) {
      this.actionTimer--;
      if (this.actionTimer <= 0) {
        this.action = null;
      }
    }
  }

  // 绘制噜噜
  draw(ctx, x, y) {
    const size = this.getSize();
    const color = COLORS.PRIMARY;
    
    ctx.save();
    ctx.translate(x, y + this.breatheOffset);
    
    // 身体（椭圆）
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 头部（圆）
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // 耳朵
    ctx.beginPath();
    ctx.ellipse(-size * 0.25, -size * 0.5, size * 0.1, size * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.25, -size * 0.5, size * 0.1, size * 0.08, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-size * 0.12, -size * 0.35, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.12, -size * 0.35, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    
    // 鼻子（大椭圆）
    ctx.fillStyle = '#5D4E37';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.2, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 腿（四条小短腿）
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.35, size * 0.2, size * 0.12, size * 0.15);
    ctx.fillRect(size * 0.23, size * 0.2, size * 0.12, size * 0.15);
    ctx.fillRect(-size * 0.15, size * 0.25, size * 0.1, size * 0.12);
    ctx.fillRect(size * 0.05, size * 0.25, size * 0.1, size * 0.12);
    
    ctx.restore();
  }
}

module.exports = Lulu;
```

- [ ] **Step 2: Commit**

```bash
git add js/Lulu.js
git commit -m "feat: 噜噜角色类"
```

---

## 阶段四：任务系统

### Task 5: 任务管理

**Files:**
- Create: `js/TaskManager.js`

**Steps:**

- [ ] **Step 1: 创建 `js/TaskManager.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add js/TaskManager.js
git commit -m "feat: 任务管理系统"
```

---

## 阶段五：成长系统

### Task 6: 成长/XP系统

**Files:**
- Create: `js/GrowthSystem.js`

**Steps:**

- [ ] **Step 1: 创建 `js/GrowthSystem.js`**

```javascript
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

  // 添加 XP
  addXp(amount) {
    this.xp += amount;
    this.totalXp += amount;
    
    // 检查是否升级
    while (this.xp >= this.getXpForNextLevel()) {
      this.xp -= this.getXpForNextLevel();
      this.levelUp();
    }
    
    return { leveled: this.xp === 0, newLevel: this.level };
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
```

- [ ] **Step 2: Commit**

```bash
git add js/GrowthSystem.js
git commit -m "feat: 成长/XP系统"
```

---

## 阶段六：UI 组件

### Task 7: 首页（噜噜展示）

**Files:**
- Create: `js/ui/HomePage.js`

**Steps:**

- [ ] **Step 1: 创建 `js/ui/HomePage.js`**

```javascript
const { COLORS } = require('../utils/constants');

class HomePage {
  constructor(game) {
    this.game = game;
    this.lulu = null;
  }

  setLulu(lulu) {
    this.lulu = lulu;
  }

  // 点击检测
  handleClick(x, y, canvasWidth, canvasHeight) {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2 - 50;
    const size = this.lulu ? this.lulu.getSize() : 100;
    
    // 点击噜噜区域
    if (x > centerX - size && x < centerX + size &&
        y > centerY - size && y < centerY + size) {
      this.onLuluClick();
      return true;
    }
    
    // 点击任务按钮
    if (x > canvasWidth - 80 && x < canvasWidth - 20 &&
        y > 20 && y < 60) {
      this.game.showTaskPage();
      return true;
    }
    
    // 点击图鉴按钮
    if (x > 20 && x < 80 && y > 20 && y < 60) {
      this.game.showGalleryPage();
      return true;
    }
    
    return false;
  }

  onLuluClick() {
    if (this.lulu) {
      this.lulu.triggerRandomAction();
    }
    this.game.onLuluInteraction();
  }

  // 绘制
  render(ctx, canvasWidth, canvasHeight) {
    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 绘制噜噜
    if (this.lulu) {
      this.lulu.update();
      this.lulu.draw(ctx, canvasWidth / 2, canvasHeight / 2 - 50);
    }
    
    // 绘制等级和经验条
    this.drawStatusBar(ctx, canvasWidth);
    
    // 绘制按钮
    this.drawButtons(ctx, canvasWidth);
    
    // 绘制互动文字
    if (this.lulu && this.lulu.action) {
      this.drawActionText(ctx, canvasWidth / 2, canvasHeight / 2 + 100);
    }
  }

  drawStatusBar(ctx, canvasWidth) {
    const barWidth = 200;
    const barHeight = 20;
    const x = (canvasWidth - barWidth) / 2;
    const y = canvasHeight - 150;
    
    const growth = this.game.growth;
    const progress = growth.getXpProgress();
    
    // 等级文字
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${growth.level} ${growth.getStage().name}`, canvasWidth / 2, y - 10);
    
    // 经验条背景
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // 经验条填充
    ctx.fillStyle = COLORS.SECONDARY;
    ctx.fillRect(x, y, barWidth * progress, barHeight);
    
    // XP 文字
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    ctx.fillText(`${growth.xp}/${growth.getXpForNextLevel()} XP`, canvasWidth / 2, y + barHeight + 15);
  }

  drawButtons(ctx, canvasWidth) {
    // 任务按钮
    ctx.fillStyle = COLORS.ACCENT;
    this.roundRect(ctx, canvasWidth - 80, 20, 60, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('任务', canvasWidth - 50, 48);
    
    // 图鉴按钮
    ctx.fillStyle = COLORS.SECONDARY;
    this.roundRect(ctx, 20, 20, 60, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText('图鉴', 50, 48);
  }

  drawActionText(ctx, x, y) {
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.lulu.getActionText(), x, y);
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

module.exports = HomePage;
```

- [ ] **Step 2: Commit**

```bash
git add js/ui/HomePage.js
git commit -m "feat: 首页UI组件"
```

---

### Task 8: 任务页

**Files:**
- Create: `js/ui/TaskPage.js`

**Steps:**

- [ ] **Step 1: 创建 `js/ui/TaskPage.js`**

```javascript
const { COLORS, TASKS } = require('../utils/constants');

class TaskPage {
  constructor(game) {
    this.game = game;
    this.taskButtons = [];
  }

  // 绘制
  render(ctx, canvasWidth, canvasHeight) {
    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 标题
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('今日任务', canvasWidth / 2, 50);
    
    // 返回按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('< 返回', 20, 35);
    
    // 今日获得 XP
    const taskManager = this.game.taskManager;
    const totalXp = taskManager.getTotalXp();
    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`今日可获得: ${totalXp} XP`, canvasWidth / 2, 90);
    
    // 任务列表
    this.taskButtons = [];
    const tasks = taskManager.getTodayTasks();
    let y = 130;
    
    for (const task of tasks) {
      this.drawTaskItem(ctx, task, canvasWidth, y);
      y += 70;
    }
    
    // 添加任务按钮
    this.drawAddButton(ctx, canvasWidth, y + 20);
  }

  drawTaskItem(ctx, task, canvasWidth, y) {
    const x = 30;
    const width = canvasWidth - 60;
    const height = 60;
    
    // 按钮区域
    this.taskButtons.push({ x, y, width, height, task });
    
    // 背景
    ctx.fillStyle = task.completed ? '#E8F5E9' : '#FFF';
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = task.completed ? COLORS.SECONDARY : '#E0E0E0';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.stroke();
    
    // 图标
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(task.icon, x + 35, y + 38);
    
    // 名称
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(task.name, x + 70, y + 28);
    
    // 描述
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    ctx.fillText(task.desc, x + 70, y + 45);
    
    // XP
    ctx.fillStyle = task.completed ? COLORS.SECONDARY : COLORS.ACCENT;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`+${task.xp} XP`, x + width - 20, y + 38);
    
    // 完成标记
    if (task.completed) {
      ctx.fillStyle = COLORS.SECONDARY;
      ctx.font = '20px sans-serif';
      ctx.fillText('✓', x + width - 50, y + 38);
    }
  }

  drawAddButton(ctx, canvasWidth, y) {
    const width = canvasWidth - 60;
    const height = 50;
    const x = 30;
    
    this.taskButtons.push({ x, y, width, height, isAddButton: true });
    
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = COLORS.ACCENT;
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+ 添加自定义任务', canvasWidth / 2, y + 32);
  }

  // 点击检测
  handleClick(x, y) {
    for (const btn of this.taskButtons) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        if (btn.isAddButton) {
          // 添加自定义任务（简化版）
          this.game.taskManager.addCustomTask({
            name: '自定义任务',
            icon: '✨',
            xp: 10,
            desc: '自定义任务描述',
          });
        } else if (!btn.task.completed) {
          // 完成任务
          this.game.completeTask(btn.task.id);
        }
        return true;
      }
    }
    
    // 返回按钮
    if (x < 80 && y < 50) {
      this.game.showHomePage();
      return true;
    }
    
    return false;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

module.exports = TaskPage;
```

- [ ] **Step 2: Commit**

```bash
git add js/ui/TaskPage.js
git commit -m "feat: 任务页UI"
```

---

### Task 9: 图鉴页

**Files:**
- Create: `js/ui/GalleryPage.js`

**Steps:**

- [ ] **Step 1: 创建 `js/ui/GalleryPage.js`**

```javascript
const { COLORS, LULU_STAGES, SCENES } = require('../utils/constants');

class GalleryPage {
  constructor(game) {
    this.game = game;
  }

  render(ctx, canvasWidth, canvasHeight) {
    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 标题
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('噜噜图鉴', canvasWidth / 2, 50);
    
    // 返回按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('< 返回', 20, 35);
    
    // 当前噜噜展示
    const lulu = this.game.lulu;
    if (lulu) {
      lulu.update();
      lulu.draw(ctx, canvasWidth / 2, 160);
      
      // 等级名称
      ctx.fillStyle = COLORS.TEXT_PRIMARY;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`${lulu.getStage().name}  Lv.${lulu.level}`, canvasWidth / 2, 280);
    }
    
    // 成长阶段
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('成长阶段', 30, 320);
    
    let stageY = 350;
    for (const [id, stage] of Object.entries(LULU_STAGES)) {
      const isUnlocked = lulu.level >= stage.level[0];
      ctx.fillStyle = isUnlocked ? COLORS.PRIMARY : '#CCC';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${isUnlocked ? '✓' : '○'} ${stage.name}`, 30, stageY);
      ctx.fillText(`Lv.${stage.level[0]}-${stage.level[1]}`, 150, stageY);
      stageY += 30;
    }
    
    // 场景
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('已解锁场景', 30, stageY + 20);
    
    let sceneY = stageY + 50;
    const growth = this.game.growth;
    for (const [id, scene] of Object.entries(SCENES)) {
      const isUnlocked = growth.unlockedScenes.includes(id);
      ctx.fillStyle = isUnlocked ? COLORS.SECONDARY : '#CCC';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${isUnlocked ? '🖼️' : '🔒'} ${scene.name}`, 30, sceneY);
      ctx.fillText(`Lv.${scene.unlockLevel}+`, 150, sceneY);
      sceneY += 30;
    }
    
    // 爱心币
    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`❤️ ${growth.loveCoins}`, canvasWidth - 30, 50);
  }

  handleClick(x, y, canvasWidth, canvasHeight) {
    // 返回按钮
    if (x < 80 && y < 50) {
      this.game.showHomePage();
      return true;
    }
    return false;
  }
}

module.exports = GalleryPage;
```

- [ ] **Step 2: Commit**

```bash
git add js/ui/GalleryPage.js
git commit -m "feat: 图鉴页UI"
```

---

## 阶段七：游戏主控制器

### Task 10: 游戏主控制器

**Files:**
- Modify: `js/main.js`

**Steps:**

- [ ] **Step 1: 重写 `js/main.js`**

```javascript
import './render';

const Lulu = require('./Lulu');
const TaskManager = require('./TaskManager');
const GrowthSystem = require('./GrowthSystem');
const Storage = require('./Storage');
const HomePage = require('./ui/HomePage');
const TaskPage = require('./ui/TaskPage');
const GalleryPage = require('./ui/GalleryPage');

class Game {
  constructor() {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 初始化组件
    this.storage = new Storage();
    this.lulu = new Lulu();
    this.taskManager = new TaskManager();
    this.growth = new GrowthSystem();
    
    // UI 页面
    this.homePage = new HomePage(this);
    this.taskPage = new TaskPage(this);
    this.galleryPage = new GalleryPage(this);
    this.currentPage = 'home';
    
    // 加载存档
    this.loadData();
    
    // 设置页面
    this.homePage.setLulu(this.lulu);
    
    // 触摸事件
    this.setupTouchHandlers();
    
    // 启动游戏循环
    this.loop();
  }

  setupTouchHandlers() {
    wx.onTouchStart((res) => {
      if (res.touches.length > 0) {
        const touch = res.touches[0];
        this.handleClick(touch.clientX, touch.clientY);
      }
    });
  }

  handleClick(x, y) {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    switch (this.currentPage) {
      case 'home':
        if (this.homePage.handleClick(x, y, canvasWidth, canvasHeight)) return;
        break;
      case 'tasks':
        if (this.taskPage.handleClick(x, y)) return;
        break;
      case 'gallery':
        if (this.galleryPage.handleClick(x, y, canvasWidth, canvasHeight)) return;
        break;
    }
  }

  loadData() {
    // 加载噜噜数据
    const luluData = this.storage.get('lulu_data');
    if (luluData) {
      this.lulu.level = luluData.level || 1;
      this.lulu.xp = luluData.xp || 0;
    }
    
    // 加载任务数据
    const taskData = this.storage.get('task_data');
    if (taskData) {
      this.taskManager.deserialize(taskData);
    }
    this.taskManager.checkDailyReset();
    
    // 加载成长数据
    const growthData = this.storage.get('growth_data');
    if (growthData) {
      this.growth.deserialize(growthData);
    }
  }

  saveData() {
    this.storage.set('lulu_data', {
      level: this.lulu.level,
      xp: this.lulu.xp,
    });
    this.storage.set('task_data', this.taskManager.serialize());
    this.storage.set('growth_data', this.growth.serialize());
  }

  // 完成任务
  completeTask(taskId) {
    if (this.taskManager.completeTask(taskId)) {
      const taskXp = this.taskManager.getTodayTasks().find(t => t.id === taskId)?.xp || 0;
      const result = this.growth.addXp(taskXp);
      
      // 更新噜噜等级
      if (result.leveled) {
        this.lulu.level = result.newLevel;
      }
      
      this.saveData();
    }
  }

  // 噜噜互动
  onLuluInteraction() {
    // 互动反馈
    console.log('Lulu interaction!');
  }

  // 页面切换
  showHomePage() {
    this.currentPage = 'home';
  }

  showTaskPage() {
    this.currentPage = 'tasks';
  }

  showGalleryPage() {
    this.currentPage = 'gallery';
  }

  // 游戏循环
  loop() {
    this.update();
    this.render();
    wx.requestAnimationFrame(() => this.loop());
  }

  update() {
    if (this.currentPage === 'home') {
      this.lulu.update();
    }
  }

  render() {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    switch (this.currentPage) {
      case 'home':
        this.homePage.render(this.ctx, canvasWidth, canvasHeight);
        break;
      case 'tasks':
        this.taskPage.render(this.ctx, canvasWidth, canvasHeight);
        break;
      case 'gallery':
        this.galleryPage.render(this.ctx, canvasWidth, canvasHeight);
        break;
    }
  }
}

export default Game;
```

- [ ] **Step 2: Commit**

```bash
git add js/main.js
git commit -m "feat: 游戏主控制器"
```

---

## 阶段八：测试与优化

### Task 11: 测试验证

**Files:**
- 验证所有模块可正常工作

**Steps:**

- [ ] **Step 1: 在微信开发者工具中打开项目**
- [ ] **Step 2: 检查首页是否显示噜噜**
- [ ] **Step 3: 点击噜噜测试互动**
- [ ] **Step 4: 点击任务按钮进入任务页**
- [ ] **Step 5: 点击完成任务测试 XP 获得**
- [ ] **Step 6: 检查本地存储是否正常**

---

## 整体验收标准

- [ ] 噜噜在首页中央展示，有轻微呼吸动画
- [ ] 点击噜噜触发随机动作
- [ ] 任务页显示4个固定任务
- [ ] 完成任务获得 XP
- [ ] XP 攒够后噜噜升级
- [ ] 噜噜等级显示在首页
- [ ] 图鉴页显示成长阶段和场景
- [ ] 存档正确保存和读取

---

**Plan 完成时间预估：**
- Task 1-3 (脚手架): 5分钟
- Task 4 (噜噜类): 10分钟
- Task 5 (任务系统): 10分钟
- Task 6 (成长系统): 10分钟
- Task 7-9 (UI组件): 20分钟
- Task 10 (主控制器): 15分钟
- Task 11 (测试): 10分钟

**总计约 80 分钟**
