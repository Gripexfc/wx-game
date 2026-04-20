# 噜噜陪你成长 — 功能扩展实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 v1 代码库上新增 4 项功能：宠物自动动作（卖萌/爬/跑）、任务状态切换与 XP 联动、Banner 广告、首次昵称引导

**Architecture:** 在现有模块化结构上新增 2 个文件（BannerAdManager、OnboardingPage），修改 6 个现有文件。Banner 广告单例管理，宠物动作以内联状态机实现，任务切换改造为 toggle 模式。

**Tech Stack:** 微信小游戏 Canvas API + JavaScript (ES6+)，无第三方框架

---

## 文件变更总览

| 操作 | 文件 |
|------|------|
| 修改 | `js/Lulu.js` — 增加自动动作状态机 |
| 修改 | `js/TaskManager.js` — toggle 逻辑 |
| 修改 | `js/GrowthSystem.js` — XP 正负统一处理 |
| 修改 | `js/main.js` — 昵称检测、Onboarding 入口 |
| 修改 | `js/ui/HomePage.js` — Banner show/hide、动态昵称 |
| 修改 | `js/ui/TaskPage.js` — Banner show/hide |
| 新建 | `js/ads/BannerAdManager.js` — Banner 广告单例 |
| 新建 | `js/ui/OnboardingPage.js` — 昵称引导页 |

---

## Task 1: 宠物自动动作状态机（Lulu.js）

**Files:**
- Modify: `js/Lulu.js`

### 1.1 添加状态字段

在 constructor 中 `this.todayInteractionCount = 0;` 之后添加：

```javascript
this.autoAction = null;        // 'cute'|'crawl'|'run'|null
this.autoActionTimer = 0;      // 当前动作剩余帧数
this.nextAutoActionAt = 240 + Math.floor(Math.random() * 120); // 下次触发帧数
this.autoActionPaused = false; // 用户交互中暂停
this._autoActionPhase = 0;     // 动作内帧计数（用于动画插值）
```

### 1.2 修改 update() 方法

在 `update()` 方法末尾（`this.hopY += this.hopVy;` 块之后）添加自动动作逻辑：

```javascript
// ===== 自动动作状态机 =====
if (!this.autoActionPaused && this.legacyActionTimer <= 0) {
  if (this.autoAction) {
    this.autoActionTimer -= 1;
    this._autoActionPhase += 1;
    if (this.autoActionTimer <= 0) {
      this.autoAction = null;
      this._autoActionPhase = 0;
      this.nextAutoActionAt = 180 + Math.floor(Math.random() * 120);
    }
  } else {
    this.nextAutoActionAt -= 1;
    if (this.nextAutoActionAt <= 0) {
      if (Math.random() < 0.3) {
        const pool = ['cute', 'crawl', 'run'];
        this.autoAction = pool[Math.floor(Math.random() * pool.length)];
        const durations = { cute: 80, crawl: 120, run: 100 };
        this.autoActionTimer = durations[this.autoAction] || 90;
        this._autoActionPhase = 0;
      } else {
        this.nextAutoActionAt = 180 + Math.floor(Math.random() * 120);
      }
    }
  }
}
```

### 1.3 修改 beginPetDrag() / endPetDrag()

将现有方法替换为：

```javascript
beginPetDrag() {
  this.petDragging = true;
  this.autoActionPaused = true;
}

endPetDrag() {
  this.petDragging = false;
  // 交互结束后 60 帧再恢复自动动作
  this.nextAutoActionAt = 60;
  this.autoActionPaused = false;
}
```

### 1.4 修改 onTap()

在 `onTap()` 方法开头添加：

```javascript
this.autoActionPaused = true;
this.nextAutoActionAt = 60;
```

在 `onTap()` 末尾添加恢复：

```javascript
// 在 say() 调用之后添加
setTimeout(() => { this.autoActionPaused = false; }, 1200);
```

（注意：直接在 onTap 末尾加 `this.autoActionPaused = false` 不对，因为要让动作停够一段时间。方案是在 onTap 结束时设置 `this.autoActionPaused = false` 并将 `this.nextAutoActionAt` 重置为一个小值，使得下一帧就开始检测，而不是立即触发。修改为：）

删除上面 setTimeout 方案，改为在 `onTap()` 末尾直接：

```javascript
this.autoActionPaused = false;
if (this.autoAction) { this.autoAction = null; this._autoActionPhase = 0; }
this.nextAutoActionAt = 180 + Math.floor(Math.random() * 120);
```

### 1.5 修改 _drawPetFront() 绘制差异

在 `const bodyRy = base * 0.42; const bodyRx = base * 0.48;` 之后添加动作状态变量：

```javascript
let bodyOffsetX = 0;
let bodyOffsetY = 0;
let bodyTilt = 0;
let eyeSquint = 0;
let legPhase = this._autoActionPhase;
let armPhase = this._autoActionPhase;

if (this.autoAction === 'cute') {
  eyeSquint = 1; // 眯眼
  bodyOffsetY = Math.sin(this._autoActionPhase * 0.18) * 3; // 上下晃
} else if (this.autoAction === 'crawl') {
  bodyOffsetX = Math.sin(this._autoActionPhase * 0.12) * 4; // 前倾
  bodyOffsetY = Math.abs(Math.sin(this._autoActionPhase * 0.12)) * 2;
} else if (this.autoAction === 'run') {
  bodyTilt = Math.sin(this._autoActionPhase * 0.25) * 0.06;
  legPhase = this._autoActionPhase * 2;
  armPhase = this._autoActionPhase * 2;
}
```

在 `ctx.translate(cx, cy);` 之前添加：

```javascript
ctx.translate(bodyOffsetX, bodyOffsetY);
ctx.rotate(bodyTilt);
```

（注意：这段 translate/rotate 要在 `ctx.save()` 之后、`ctx.translate(cx, cy);` 之前加，否则坐标会乱。）

### 1.6 修改眨眼逻辑（cute 眯眼）

找到 `_drawPetFront` 中 `const blink = this.blinkTimer > 0;`，改为：

```javascript
const blink = this.blinkTimer > 0;
const squint = eyeSquint > 0;
```

在眨眼绘制 `if (!blink)` 分支中，把眼睛绘制代码用 `if (!blink && !squint)` 包裹，然后添加 cute 眯眼弧线：

```javascript
// 卖萌眯眼：两条弧线
if (squint) {
  ctx.strokeStyle = '#C8A070';
  ctx.lineWidth = headR * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(hx - headR * 0.28 + eyeOff, eyeY, headR * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx + headR * 0.28 + eyeOff, eyeY, headR * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
}
```

### 1.7 添加 getActionText() 联动

找到 `getActionText()` 方法，在 `if (this.legacyAction)` 之前添加：

```javascript
if (this.autoAction) {
  const labels = { cute: '卖萌中…', crawl: '爬呀爬…', run: '跑起来！' };
  return labels[this.autoAction] || '';
}
```

### 1.8 提交

```bash
git add js/Lulu.js
git commit -m "feat: 宠物自动动作状态机（卖萌/爬/跑）"
```

---

## Task 2: 任务状态切换与 XP 联动（TaskManager.js）

**Files:**
- Modify: `js/TaskManager.js`

### 2.1 添加辅助方法

在 `getTodayString()` 方法之后添加：

```javascript
/** 返回任务当前完成状态（内部使用） */
_getTaskCompleted(taskId) {
  if (taskId === PLACEHOLDER_ID) return false;
  if (this.todayTasks.hasOwnProperty(taskId)) {
    return !!this.todayTasks[taskId];
  }
  if (this.dailyCustom && this.dailyCustom.id === taskId) {
    return !!this.dailyCustom.completed;
  }
  return false;
}
```

### 2.2 重写 completeTask 为 toggleTask

将现有 `completeTask` 方法替换为：

```javascript
/** 切换任务完成状态，返回 { completed, xpDelta }
 *  completed: 切换后的完成状态
 *  xpDelta: XP 变化量（正=获得，负=扣除）
 */
toggleTask(taskId) {
  if (taskId === PLACEHOLDER_ID) return { completed: false, xpDelta: 0 };

  if (this.todayTasks.hasOwnProperty(taskId)) {
    const wasCompleted = !!this.todayTasks[taskId];
    this.todayTasks[taskId] = !wasCompleted;
    const taskDef = Object.values(require('../utils/constants').TASKS).find(t => t.id === taskId);
    const xp = taskDef ? taskDef.xp : 0;
    return { completed: !wasCompleted, xpDelta: wasCompleted ? -xp : xp };
  }

  if (this.dailyCustom && this.dailyCustom.id === taskId) {
    const wasCompleted = !!this.dailyCustom.completed;
    this.dailyCustom.completed = !wasCompleted;
    const xp = this.dailyCustom.xp || 0;
    return { completed: !wasCompleted, xpDelta: wasCompleted ? -xp : xp };
  }

  return { completed: false, xpDelta: 0 };
}
```

（注意：`require` 在方法内部会导致每次调用都重新加载模块。改为在文件顶部已 import TASKS 的情况下直接引用 `this._TASKS` 或将 TASKS 存为实例属性。修改：在 constructor 中添加 `this._TASKS = TASKS;`，然后在 toggleTask 中用 `this._TASKS`。）

### 2.3 提交

```bash
git add js/TaskManager.js
git commit -m "feat: 任务状态切换逻辑（toggle）+ XP 返还"
```

---

## Task 3: GrowthSystem XP 正负统一处理

**Files:**
- Modify: `js/GrowthSystem.js`

### 3.1 修改 addXp 支持负数

将现有的 `addXp` 方法替换为：

```javascript
// 添加 XP（amount 可为负数）
addXp(amount) {
  if (amount === 0) return { leveled: false, newLevel: this.level };

  if (amount > 0) {
    this.xp += amount;
    this.totalXp += amount;
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
```

### 3.2 提交

```bash
git add js/GrowthSystem.js
git commit -m "feat: GrowthSystem.addXp 支持负数（降级处理）"
```

---

## Task 4: Banner 广告管理器（BannerAdManager.js）

**Files:**
- Create: `js/ads/BannerAdManager.js`

### 4.1 创建文件

```javascript
/**
 * Banner 广告管理器（单例）
 * 在 HomePage 和 TaskPage 渲染时调用 show()，切换页面时调用 hide()
 */

let _instance = null;

class BannerAdManager {
  constructor() {
    this._ad = null;
    this._visible = false;
    this._adUnitId = null;
  }

  /** 获取单例 */
  static getInstance() {
    if (!_instance) {
      _instance = new BannerAdManager();
    }
    return _instance;
  }

  /** 初始化（占位 ID 不加载，避免开发者工具报错） */
  init(adUnitId) {
    if (!adUnitId || String(adUnitId).includes('YOUR_') || String(adUnitId).includes('PLACEHOLDER')) {
      return;
    }
    this._adUnitId = adUnitId;
    this._create();
  }

  _create() {
    if (typeof wx === 'undefined' || !wx.createBannerAd) return;

    try {
      this._ad = wx.createBannerAd({
        adUnitId: this._adUnitId,
        style: {
          left: 0,
          top: 0,
          width: 320,
        },
      });

      this._ad.onError((err) => {
        console.warn('Banner ad error:', err);
        this._hideReal();
      });

      this._ad.onResize((res) => {
        if (this._ad && this._ad.style) {
          const sys = wx.getSystemInfoSync();
          this._ad.style.top = sys.windowHeight - this._ad.style.height;
        }
      });

      this._ad.onLoad(() => {
        console.log('Banner ad loaded');
      });
    } catch (e) {
      console.warn('Banner ad create failed:', e);
      this._ad = null;
    }
  }

  /** 显示 Banner */
  show() {
    if (!this._ad) return;
    this._visible = true;
    this._ad.show().catch(() => {
      this._visible = false;
    });
  }

  /** 隐藏 Banner */
  hide() {
    this._visible = false;
    this._hideReal();
  }

  _hideReal() {
    if (!this._ad) return;
    try {
      this._ad.hide();
    } catch (e) {
      // ignore
    }
  }

  /** 销毁实例 */
  destroy() {
    if (this._ad) {
      try {
        this._ad.destroy();
      } catch (e) {
        // ignore
      }
      this._ad = null;
    }
    this._visible = false;
  }
}

module.exports = BannerAdManager;
```

### 4.2 提交

```bash
git add js/ads/BannerAdManager.js
git commit -m "feat: Banner广告管理器单例"
```

---

## Task 5: 昵称引导页（OnboardingPage.js）

**Files:**
- Create: `js/ui/OnboardingPage.js`

### 5.1 创建文件

```javascript
/**
 * 首次昵称引导页
 */
const BannerAdManager = require('../ads/BannerAdManager');

class OnboardingPage {
  constructor(game) {
    this.game = game;
    this.lulu = null;
    this.inputValue = '';
    this.confirmEnabled = false;
    this._banner = BannerAdManager.getInstance();
  }

  setLulu(lulu) {
    this.lulu = lulu;
  }

  /** 触摸开始 */
  onTouchStart(x, y, canvasWidth, canvasHeight) {
    // 检测确定按钮
    const btnW = 140;
    const btnH = 46;
    const btnX = (canvasWidth - btnW) / 2;
    const btnY = canvasHeight * 0.68;
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      if (this.confirmEnabled) {
        this._onConfirm();
      }
    }
  }

  /** 键盘输入（微信小游戏通过 showModal 的 editable 实现） */
  _onConfirm() {
    const name = this.inputValue.trim();
    if (!name || name.length > 10) return;

    this.game.storage.set('lulu_name', name);
    this.game.onNameSet(name);
  }

  /** 外部调用：设置输入值（由 main.js 通过 showModal 回调设置） */
  setInputValue(v) {
    this.inputValue = String(v || '').slice(0, 10);
    this.confirmEnabled = this.inputValue.length > 0;
  }

  /** 外部调用：打开输入弹窗 */
  promptInput() {
    if (typeof wx === 'undefined' || !wx.showModal) return;

    const game = this.game;
    wx.showModal({
      title: '给噜噜起个名字',
      editable: true,
      placeholderText: '最多10个字',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const val = (res.content != null ? String(res.content) : '').trim();
          if (val && val.length <= 10) {
            this.setInputValue(val);
            this._onConfirm();
          } else {
            // 字数超限或为空，提示重输
            wx.showToast({ title: '名字1-10个字哦', icon: 'none', duration: 1500 });
            setTimeout(() => this.promptInput(), 1600);
          }
        } else {
          // 取消也要求填写
          wx.showToast({ title: '名字不能为空哦', icon: 'none', duration: 1500 });
          setTimeout(() => this.promptInput(), 1600);
        }
      },
      fail: () => {
        // fallback：直接用默认昵称
        this.setInputValue('主人');
        this._onConfirm();
      },
    });
  }

  /** 渲染 */
  render(ctx, canvasWidth, canvasHeight) {
    // 暖色背景
    const g = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    g.addColorStop(0, '#FFF8EE');
    g.addColorStop(0.5, '#FFF5EC');
    g.addColorStop(1, '#FFFAF5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 装饰光晕
    const glow = ctx.createRadialGradient(canvasWidth * 0.2, canvasHeight * 0.3, 10, canvasWidth * 0.2, canvasHeight * 0.3, 200);
    glow.addColorStop(0, 'rgba(255, 214, 107, 0.15)');
    glow.addColorStop(1, 'rgba(255, 214, 107, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 标题
    ctx.fillStyle = '#5B4A3A';
    ctx.font = '700 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('欢迎来到噜噜小屋', canvasWidth / 2, canvasHeight * 0.12);

    // 副标题
    ctx.fillStyle = '#8A7765';
    ctx.font = '14px sans-serif';
    ctx.fillText('给它起个名字吧', canvasWidth / 2, canvasHeight * 0.18);

    // 绘制噜噜（缩小版 idle）
    if (this.lulu) {
      this.lulu.update();
      this.lulu.drawPet(ctx, canvasWidth * 0.2, canvasHeight * 0.22, canvasWidth * 0.6, canvasHeight * 0.38);
    }

    // 输入框提示卡片
    const cardW = canvasWidth - 60;
    const cardH = 120;
    const cardX = 30;
    const cardY = canvasHeight * 0.52;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this._roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.4)';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.stroke();

    // 输入框占位区域（实际用 showModal）
    ctx.fillStyle = 'rgba(91, 74, 58, 0.1)';
    this._roundRect(ctx, cardX + 16, cardY + 20, cardW - 32, 46, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(138, 119, 101, 0.5)';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    const displayName = this.inputValue || '点击这里输入名字';
    ctx.fillText(displayName, canvasWidth / 2, cardY + 48);

    // 确定按钮
    const btnW = 140;
    const btnH = 46;
    const btnX = (canvasWidth - btnW) / 2;
    const btnY = canvasHeight * 0.68;

    const btnEnabled = this.confirmEnabled;
    ctx.fillStyle = btnEnabled ? '#FFB347' : 'rgba(255, 179, 71, 0.4)';
    this._roundRect(ctx, btnX, btnY, btnW, btnH, 23);
    ctx.fill();
    ctx.fillStyle = btnEnabled ? '#FFF' : 'rgba(255,255,255,0.7)';
    ctx.font = '600 16px sans-serif';
    ctx.fillText('确定', canvasWidth / 2, btnY + 29);

    // 提示文字
    ctx.fillStyle = 'rgba(138, 119, 101, 0.6)';
    ctx.font = '11px sans-serif';
    ctx.fillText('名字将在首页显示 · 最多10个字', canvasWidth / 2, canvasHeight * 0.76);

    // Banner 广告
    this._banner.show();
  }

  _roundRect(ctx, x, y, w, h, r) {
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

module.exports = OnboardingPage;
```

### 5.2 提交

```bash
git add js/ui/OnboardingPage.js
git commit -m "feat: 首次昵称引导页 OnboardingPage"
```

---

## Task 6: HomePage 集成 Banner + 动态昵称

**Files:**
- Modify: `js/ui/HomePage.js`
- Modify: `js/ads/BannerAdManager.js`（添加 Storage key 导出）

### 6.1 添加 BannerAdManager 引用

在 HomePage.js 顶部添加：

```javascript
const BannerAdManager = require('../ads/BannerAdManager');
```

在 constructor 中初始化：

```javascript
this._banner = BannerAdManager.getInstance();
```

### 6.2 动态昵称

找到 `ctx.fillText('小明', avatarX + avatarSize + 8, topY + topSectionH / 2 + 5);`

替换为：

```javascript
const luluName = this.game.getLuluName ? this.game.getLuluName() : '小明';
ctx.fillText(luluName, avatarX + avatarSize + 8, topY + topSectionH / 2 + 5);
```

### 6.3 渲染末尾显示 Banner

在 `render()` 方法末尾（最后一个 `ctx.fillText` 之后）添加：

```javascript
this._banner.show();
```

### 6.4 隐藏 Banner

在 `render` 开头（背景绘制之前）添加：

```javascript
this._banner.hide();
```

### 6.5 提交

```bash
git add js/ui/HomePage.js
git commit -m "feat: HomePage 集成Banner广告+动态昵称"
```

---

## Task 7: TaskPage 集成 Banner

**Files:**
- Modify: `js/ui/TaskPage.js`

### 7.1 添加 BannerAdManager 引用

在 TaskPage.js 顶部添加：

```javascript
const BannerAdManager = require('../ads/BannerAdManager');
```

在 constructor 中初始化：

```javascript
this._banner = BannerAdManager.getInstance();
```

### 7.2 渲染时 show/hide Banner

在 `render()` 方法开头（背景渐变之前）添加：

```javascript
this._banner.show();
```

### 7.3 提交

```bash
git add js/ui/TaskPage.js
git commit -m "feat: TaskPage 集成Banner广告"
```

---

## Task 8: main.js 整合所有功能

**Files:**
- Modify: `js/main.js`

### 8.1 添加 OnboardingPage 引用

找到 `const HomePage = require('./ui/HomePage');`，在后面添加：

```javascript
const OnboardingPage = require('./ui/OnboardingPage');
```

### 8.2 存储 Key 常量

在文件顶部添加：

```javascript
const STORAGE_KEYS_LULU = {
  LULU_NAME: 'lulu_name',
};
```

### 8.3 constructor 中初始化 OnboardingPage

找到 `this.homePage = new HomePage(this);`，在后面添加：

```javascript
this.onboardingPage = new OnboardingPage(this);
```

### 8.4 添加 getLuluName 方法

在 class 内部（任意位置）添加：

```javascript
getLuluName() {
  const name = this.storage.get(STORAGE_KEYS_LULU.LULU_NAME);
  return (name && name.trim()) ? name.trim() : '小明';
}
```

### 8.5 添加 onNameSet 方法

```javascript
onNameSet(name) {
  this.currentPage = 'home';
  this.homePage.setLulu(this.lulu);
}
```

### 8.6 修改 loadData — 昵称检测

找到 `loadData()` 方法，在方法开头添加：

```javascript
loadData() {
  // 检测昵称：未设置则显示引导页
  const name = this.storage.get(STORAGE_KEYS_LULU.LULU_NAME);
  if (!name || !String(name).trim()) {
    this.currentPage = 'onboarding';
    this.onboardingPage.setLulu(this.lulu);
    return;
  }

  // 原有加载逻辑...
```

然后在方法末尾（`this.lulu.level = this.growth.level;` 之后）添加 `}` 闭合 if 块。

### 8.7 修改 completeTask — 调用 toggleTask + XP 扣减

找到现有的 `completeTask` 方法，替换为：

```javascript
completeTask(taskId) {
  const result = this.taskManager.toggleTask(taskId);
  if (result.xpDelta !== 0) {
    const xpResult = this.growth.addXp(result.xpDelta);
    if (result.xpDelta > 0 && result.completed) {
      // 完成任务奖励
      if (this.lulu.onOwnerFinishedTask) {
        const task = this.taskManager.getTodayTasks().find(t => t.id === taskId);
        this.lulu.onOwnerFinishedTask(task?.name || '任务');
      }
    }
    if (result.xpDelta < 0) {
      // 取消完成：等级可能回退
      this.lulu.level = this.growth.level;
    } else if (xpResult.leveled) {
      this.lulu.level = xpResult.newLevel;
    }
    this.saveData();
  }
}
```

### 8.8 初始化 Banner 广告

在 `loadData()` 之后（constructor 中）添加：

```javascript
// 初始化 Banner 广告（占位 ID 不加载）
const BannerAdManager = require('./ads/BannerAdManager');
BannerAdManager.getInstance().init('YOUR_BANNER_AD_UNIT_ID');
```

### 8.9 render 中添加 OnboardingPage 分支

找到 `render()` 方法中的 switch，添加：

```javascript
case 'onboarding':
  if (this.onboardingPage) {
    this.onboardingPage.render(this.ctx, canvasWidth, canvasHeight);
  }
  break;
```

### 8.10 handleClick 中添加 OnboardingPage 触摸

在 `handleClick` 的 switch 中添加：

```javascript
case 'onboarding':
  if (this.onboardingPage) {
    this.onboardingPage.onTouchStart(x, y, canvasWidth, canvasHeight);
  }
  break;
```

### 8.11 提交

```bash
git add js/main.js
git commit -m "feat: main.js 整合昵称引导+任务切换+Banner广告"
```

---

## 验收标准

- [ ] 噜噜每隔约 3-5 秒有 30% 概率自动执行一次动作（卖萌/爬/跑）
- [ ] 用户点击/拖拽噜噜时，自动动作暂停，交互结束后恢复
- [ ] 任务点击完成可再次点击取消，XP 实时增减
- [ ] 取消任务后等级可能回退（XP 不够扣时降级）
- [ ] 首页和任务页底部显示 Banner 广告
- [ ] 首次进入显示昵称输入页（showModal 形式），填写后进入首页
- [ ] 首页左上角显示用户设置的昵称
- [ ] 昵称持久化，退出重进无需重新填写
