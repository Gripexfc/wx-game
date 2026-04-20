# 噜噜陪你成长 — 功能扩展设计文档

> 日期：2026-04-20
> 目标：在现有 v1 基础上新增 4 项功能：宠物自动动作、任务状态切换、Banner 广告、首次昵称引导

---

## 1. 宠物自动动作系统

### 1.1 动作类型

| 动作 | actionType | 视觉特征 | 持续时长 |
|------|-----------|----------|----------|
| 卖萌 | `cute` | 身体上下微晃 + 眼睛眯成弧线 + 头顶橘子轻摇 | 80 帧 |
| 爬行 | `crawl` | 身体前倾 + 手脚交替向前 + 头部左右探出 | 120 帧 |
| 奔跑 | `run` | 身体倾斜 + 手脚快速轮动 + 地面尘土效果 | 100 帧 |
| idle | `null` | 呼吸摇晃，无特殊动作 | 持续 |

### 1.2 触发机制

- **自动触发**：每隔 180-300 帧（随机）自动切换一次动作，切换概率 30%
- **不打断用户交互**：用户点击/拖拽噜噜时，暂停自动动作计时器，交互结束后 60 帧再恢复
- **动作优先级**：idle > 自动动作 > legacyAction（旧有动作），legacyAction 播完才进入自动动作轮询

### 1.3 状态字段（新增到 Lulu.js）

```javascript
this.autoAction = null;        // 当前自动动作 'cute'|'crawl'|'run'|null
this.autoActionTimer = 0;      // 当前动作剩余帧数
this.nextAutoActionAt = 240 + Math.floor(Math.random() * 120); // 下次触发帧数
this.autoActionPaused = false; // 用户交互中暂停
```

### 1.4 绘制差异

- `cute`：在 `_drawPetFront` 的眨眼逻辑上增加眯眼弧线，bob 振幅 ×1.5
- `crawl`：在 `_drawPetFront` 中添加 body 前倾（translate 偏移），手脚位置交错
- `run`：手脚快速轮动（手脚 rotation 角度变化），添加地面小圆点尘土

---

## 2. 任务状态切换与 XP 联动

### 2.1 toggleTask(taskId)

修改 `TaskManager.completeTask` 为 toggle 逻辑：

```
已完成 → 点击 → 取消完成（completed = false），扣除 XP
未完成 → 点击 → 完成（completed = true），获得 XP
```

### 2.2 XP 扣减逻辑

**TaskManager 变化时调用：**

```javascript
// 完成时：获得 XP
const delta = task.xp;  // 正值

// 取消完成时：扣除 XP
const delta = -task.xp; // 负值
```

调用 `growth.addXp(delta)`（delta 可为负）。

### 2.3 GrowthSystem.subtractXp

在 `GrowthSystem.js` 新增：

```javascript
subtractXp(amount) {
  this.xp -= amount;
  this.totalXp = Math.max(0, this.totalXp - amount);
  // 降级处理：XP 不够扣时向上一级借
  while (this.xp < 0 && this.level > 1) {
    this.level--;
    this.xp += this.getXpForNextLevel();
  }
  if (this.xp < 0) this.xp = 0;
  return { leveled: true, newLevel: this.level };
}
```

### 2.4 每日重置

- 每日 0 点重置任务状态
- 重置时 XP 不回退（已升级的等级保留，仅当日任务进度清空）

---

## 3. Banner 广告系统

### 3.1 广告实例管理

新建 `js/ads/BannerAdManager.js`，单例模式：

```javascript
class BannerAdManager {
  constructor()
  init(rewardedVideoAdUnitId)      // 初始化（占位ID不加载）
  show()                           // 显示 Banner
  hide()                           // 隐藏 Banner
  resize(top)                      // 重新定位（页面切换时）
  destroy()                        // 销毁实例
}
```

- 使用 `wx.createBannerAd`，`style.top` 固定在屏幕底部
- Banner 宽度 320px，高度自适应（微信限制最小 100px）
- 复用同一实例，切换页面时 `hide/show`，避免重复创建

### 3.2 展示策略

| 页面 | Banner 状态 |
|------|------------|
| 首页 | 显示（HomePage 渲染末尾调用 `show`） |
| 任务页 | 显示（TaskPage 渲染末尾调用 `show`） |
| 其他页面 | 隐藏 |

### 3.3 容错

- 微信开发者工具或无广告位 ID 时静默跳过，不报错
- 广告加载失败时自动隐藏，不影响游戏

---

## 4. 首次昵称引导

### 4.1 入口逻辑

在 `Game.loadData()` 中增加：

```javascript
const name = this.storage.get('lulu_name');
if (!name || !name.trim()) {
  this.showOnboarding();
  return;
}
```

### 4.2 OnboardingPage 布局

```
┌─────────────────────────────┐
│                             │
│       噜噜（装饰性展示）      │
│                             │
│   ┌───────────────────────┐ │
│   │  给它起个名字吧～      │ │
│   │  [输入框 maxlength=10]│ │
│   │                       │ │
│   │     [ 确定 ]          │ │
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘
```

- 全屏暖色背景（与 HomePage 一致）
- 噜噜中央上方，Canvas 绘制缩小的 idle 状态
- 圆角输入框，placeholder 文字，maxlength=10
- 确定按钮：非空才可点击，点击后 `storage.set('lulu_name', name)` 并切换到 HomePage

### 4.3 昵称使用场景

- HomePage 顶部左侧显示昵称（替代硬编码的"小明"）
- 噜噜对话气泡中可引用昵称（如"今天也要加油哦～"）

---

## 5. 数据结构变更

### 5.1 存储新增 Key

```javascript
const STORAGE_KEYS = {
  // 已有...
  LULU_NAME: 'lulu_name',    // 新增：宠物昵称
};
```

### 5.2 lulu_data 变更

无需新增字段，动作状态均为运行时状态，不持久化。

### 5.3 growth_data 变更

无需新增字段，等级/XP 由现有字段覆盖。

---

## 6. 文件变更清单

| 操作 | 文件 |
|------|------|
| 修改 | `js/Lulu.js` — 增加自动动作状态机 |
| 修改 | `js/TaskManager.js` — toggle 逻辑 |
| 修改 | `js/GrowthSystem.js` — 新增 subtractXp |
| 修改 | `js/main.js` — 昵称检测、Onboarding 入口 |
| 修改 | `js/ui/HomePage.js` — Banner show/hide |
| 修改 | `js/ui/TaskPage.js` — Banner show/hide |
| 新建 | `js/ads/BannerAdManager.js` — Banner 广告单例 |
| 新建 | `js/ui/OnboardingPage.js` — 昵称引导页 |
| 新建 | `docs/superpowers/specs/2026-04-20-pet-features-design.md` — 本文档 |

---

## 7. 验收标准

- [ ] 噜噜每隔约 3-5 秒有 30% 概率自动执行一次动作（卖萌/爬/跑）
- [ ] 用户点击/拖拽噜噜时，自动动作暂停，交互结束后恢复
- [ ] 任务点击完成可再次点击取消，XP 实时增减
- [ ] 取消任务后等级可能回退（XP 不够扣时降级）
- [ ] 首页和任务页底部显示 Banner 广告
- [ ] 首次进入显示昵称输入页，填写后进入首页
- [ ] 首页左上角显示用户设置的昵称
- [ ] 昵称持久化，退出重进无需重新填写
