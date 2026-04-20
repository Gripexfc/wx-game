# 噜噜养成代码优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化代码结构（高内聚低耦合），修复5个运行时bug，删除无用代码，消除重复实现，统一数据源。

**Architecture:** 4个子项目按依赖顺序执行：①新建工具函数（无依赖）→ ②修复bug（独立）→ ③清理死代码（独立）→ ④架构优化（依赖①③）

**Tech Stack:** 微信小游戏 / Canvas 2D / Node.js单元测试

---

## 事前验证

执行前先确认当前测试全部通过：

```bash
node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js
```

预期：43 passed, 0 failed

---

## 子项目 1: 新建工具函数

### Task 1: 创建 js/utils/canvas.js

**Files:**
- Create: `js/utils/canvas.js`
- Modify: `js/ui/HomePage.js` (30 call sites), `js/ui/TaskPage.js` (3 call sites), `js/ui/OnboardingPage.js` (4 call sites), `js/Lulu.js` (1 call site)
- Test: `node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js`

- [ ] **Step 1: 创建 canvas.js 工具文件**

```js
// js/utils/canvas.js
// 圆角矩形工具函数（统一4个文件的重复实现）

/**
 * 绘制圆角矩形
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r 圆角半径
 */
function canvasRoundRect(ctx, x, y, w, h, r) {
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

module.exports = { canvasRoundRect };
```

- [ ] **Step 2: 更新 HomePage.js — 替换所有 roundRect 调用**

文件开头 require：
```js
const { canvasRoundRect } = require('../utils/canvas');
```

然后将文件内所有 `this.roundRect(ctx, ...)` 替换为 `canvasRoundRect(ctx, ...)`。

需要更新的调用点（约30处）：
- Line 377, 391, 395, 404, 408, 434, 438, 455, 458, 463, 467, 480, 483, 490, 493, 533, 548, 552, 577, 626, 630, 636

替换时保持参数完全一致。`ctx.roundRect`（line 533）保持不变（原生Canvas API）。

删除 HomePage.js 中的 `roundRect` 方法定义（line 674-682）。

- [ ] **Step 3: 更新 TaskPage.js — 替换 roundRect 调用**

文件开头 require：
```js
const { canvasRoundRect } = require('../utils/canvas');
```

替换 `this.roundRect(ctx, ...)` → `canvasRoundRect(ctx, ...)`（lines 62, 68, 111）。

删除 TaskPage.js 中的 `roundRect` 方法定义（line 151-159）。

- [ ] **Step 4: 更新 OnboardingPage.js — 替换 _roundRect 调用**

文件开头 require：
```js
const { canvasRoundRect } = require('../utils/canvas');
```

替换 `this._roundRect(ctx, ...)` → `canvasRoundRect(ctx, ...)`（lines 146, 150, 155, 171）。

删除 OnboardingPage.js 中的 `_roundRect` 方法定义（line 186-198）。

- [ ] **Step 5: 更新 Lulu.js — 替换 _roundRect 调用**

文件开头 require：
```js
const { canvasRoundRect } = require('../utils/canvas');
```

将 `this._roundRect(ctx, ...)` 替换为 `canvasRoundRect(ctx, ...)`（line 752）。

删除 Lulu.js 中的 `_roundRect` 方法定义（line 790-799）。

- [ ] **Step 6: 验证测试通过**

```bash
node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js
```

- [ ] **Step 7: 提交**

```bash
git add js/utils/canvas.js js/ui/HomePage.js js/ui/TaskPage.js js/ui/OnboardingPage.js js/Lulu.js
git commit -m "refactor: extract roundRect to js/utils/canvas.js — eliminates 4 duplicate implementations"
```

---

### Task 2: 创建 js/utils/date.js

**Files:**
- Create: `js/utils/date.js`
- Modify: `js/GoalManager.js`, `js/WishManager.js`, `js/GrowthSystem.js`, `js/PetStateManager.js`, `js/TaskManager.js`, `js/main.js`
- Test: 同上

- [ ] **Step 1: 创建 date.js 工具文件**

```js
// js/utils/date.js
// 日期工具函数（统一6个文件的 getTodayString 重复实现）

/**
 * 获取今日日期字符串 'YYYY-M-D'
 * 与各 Manager 原实现保持完全一致
 */
function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * 获取昨日日期字符串 'YYYY-M-D'
 */
function getYesterdayString() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * 计算两个日期之间的天数差
 * @param {string|Date} dateA
 * @param {string|Date} dateB
 * @returns {number} dateB - dateA 的天数
 */
function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return 0;
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

module.exports = { getTodayString, getYesterdayString, daysBetween };
```

- [ ] **Step 2: 更新 GoalManager.js**

文件开头 require：
```js
const { getTodayString } = require('../utils/date');
```

删除 `getTodayString` 方法定义（约 line 16-19）。

将文件内所有 `this.getTodayString()` 替换为 `getTodayString()`。

- [ ] **Step 3: 更新 WishManager.js**

文件开头 require：
```js
const { getTodayString } = require('../utils/date');
const { WISH_TEMPLATES } = require('../utils/constants');
```

删除 `getTodayString` 方法定义（约 line 21-24）。

将文件内所有 `this.getTodayString()` 替换为 `getTodayString()`。

- [ ] **Step 4: 更新 GrowthSystem.js**

文件开头 require：
```js
const { getTodayString, getYesterdayString } = require('../utils/date');
```

删除 `getTodayString` 和 `getYesterdayString` 方法定义（约 lines 87-96）。

将 `this.getTodayString()` 替换为 `getTodayString()`，将 `this.getYesterdayString()` 替换为 `getYesterdayString()`。

- [ ] **Step 5: 更新 PetStateManager.js**

文件开头 require：
```js
const { getTodayString } = require('../utils/date');
```

删除 `getTodayString` 方法定义（约 line 19-22）。

将文件内所有 `this.getTodayString()` 替换为 `getTodayString()`。

- [ ] **Step 6: 更新 TaskManager.js**

文件开头 require：
```js
const { getTodayString } = require('../utils/date');
```

删除 `getTodayString` 方法定义（约 line 20-23）。

将 `this.getTodayString()` 替换为 `getTodayString()`。

- [ ] **Step 7: 更新 main.js**

文件开头 require：
```js
const { daysBetween } = require('./utils/date');
```

删除 `_daysBetween` 方法定义（约 line 172-177）。

将 `this._daysBetween(...)` 替换为 `daysBetween(...)`（约 line 230）。

- [ ] **Step 8: 验证测试通过**

```bash
node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js
```

- [ ] **Step 9: 提交**

```bash
git add js/utils/date.js js/GoalManager.js js/WishManager.js js/GrowthSystem.js js/PetStateManager.js js/TaskManager.js js/main.js
git commit -m "refactor: extract date utilities to js/utils/date.js — eliminates 6 duplicate getTodayString"
```

---

## 子项目 2: 修复运行时 Bug

### Task 3: 修复 GalleryPage lulu.draw() → lulu.drawPet()

**Files:**
- Modify: `js/ui/GalleryPage.js:32`

- [ ] **Step 1: 修复 GalleryPage.js line 32**

将：
```js
lulu.draw(ctx, canvasWidth / 2, 160);
```
改为：
```js
lulu.drawPet(ctx, canvasWidth / 2, 160, canvasWidth, 300);
```

- [ ] **Step 2: 修复 GalleryPage.js line 81 (showHomePage)**

将：
```js
this.game.showHomePage();
```
改为：
```js
this.game.currentPage = 'home';
```

- [ ] **Step 3: 验证文件**

```bash
git diff js/ui/GalleryPage.js
```

- [ ] **Step 4: 提交**

```bash
git add js/ui/GalleryPage.js
git commit -m "fix: GalleryPage lulu.draw() → drawPet() and showHomePage() → currentPage"
```

---

### Task 4: 修复 HomePage completeTask() → completeGoal()

**Files:**
- Modify: `js/ui/HomePage.js:231`

- [ ] **Step 1: 修复 HomePage.js line 231**

将：
```js
this.game.completeTask(task.id);
```
改为：
```js
this.game.completeGoal(task.id);
```

- [ ] **Step 2: 提交**

```bash
git add js/ui/HomePage.js
git commit -m "fix: HomePage completeTask() → completeGoal()"
```

---

### Task 5: 修复 TaskPage completeTask() → completeGoal()

**Files:**
- Modify: `js/ui/TaskPage.js:136`

- [ ] **Step 1: 修复 TaskPage.js line 136**

将：
```js
this.game.completeTask(btn.task.id);
```
改为：
```js
this.game.completeGoal(btn.task.id);
```

- [ ] **Step 2: 修复 TaskPage.js line 144 (showHomePage)**

将：
```js
this.game.showHomePage();
```
改为：
```js
this.game.currentPage = 'home';
```

- [ ] **Step 3: 提交**

```bash
git add js/ui/TaskPage.js
git commit -m "fix: TaskPage completeTask() → completeGoal() and showHomePage() → currentPage"
```

---

### Task 6: 删除 Lulu.js 重复的 say() 定义

**Files:**
- Modify: `js/Lulu.js:125-128`

- [ ] **Step 1: 确认两个 say() 的位置**

确认 `say()` 第一次定义在 line ~104-107，第二次定义在 line ~125-128（完全相同）。

- [ ] **Step 2: 删除第二个 say() 定义（line 125-128）**

删除：
```js
say(text, frames = 110) {
  this.sayText = text;
  this.sayTimer = frames;
}
```
（保留第一个定义）

- [ ] **Step 3: 提交**

```bash
git add js/Lulu.js
git commit -m "fix: remove duplicate Lulu.say() definition at line 125"
```

---

## 子项目 3: 清理 Dead Code

### Task 7: 删除 Lulu.js 无用方法

**Files:**
- Modify: `js/Lulu.js`

需要删除的方法（确认行号后删除）：
1. `getMoodLevelName()` — 未被外部调用
2. `onOwnerFinishedTask()` — 被 onGoalCompleted 替代，未调用
3. `triggerRandomAction()` — 未调用
4. `getUnlockedActions()` — 仅被 triggerRewardInteraction 调用（triggerRewardInteraction 仅被未用的 onGoalCompleted/onOwnerFinishedTask 调用）
5. `_applyMoodSaturation()` — 未调用
6. `roundRect()` (line ~674) — 未被调用（有同名 _roundRect 使用中）

用 Grep 确认每个方法在文件外的调用情况后再删除。

- [ ] **Step 1: Grep 确认无用方法无外部调用**

```bash
grep -n "getMoodLevelName\|onOwnerFinishedTask\|triggerRandomAction\|getUnlockedActions\|_applyMoodSaturation\|roundRect" js/Lulu.js | grep -v "^[0-9]*:  //\|^[0-9]*:  \*" | head -20
```

- [ ] **Step 2: 删除确认无用的方法**（在确认无外部引用后逐个删除）

- [ ] **Step 3: 提交**

```bash
git add js/Lulu.js
git commit -m "chore: remove dead code from Lulu.js (unused methods)"
```

---

### Task 8: 删除 HomePage.js 无用代码

**Files:**
- Modify: `js/ui/HomePage.js`

- [ ] **Step 1: 删除 drawTaskCard() 方法**

在 `drawTaskCard` 方法开头加 Grep 确认无外部调用：
```bash
grep -n "drawTaskCard" js/ui/HomePage.js js/main.js js/ui/TaskPage.js js/ui/GalleryPage.js 2>/dev/null
```
确认只有 HomePage.js 定义，无外部调用后，删除整个 `drawTaskCard` 方法（约 lines 613-641）。

- [ ] **Step 2: 删除 setGameSystems 中的无用赋值**

将：
```js
onCommitGoal: (goalId) => { /* 承诺目标 */ },
onCreateGoal: (goal) => { /* 创建目标 */ },
```
改为：
```js
onCommitGoal: null,
onCreateGoal: null,
```
（或其他无害占位值，表明已不使用）

- [ ] **Step 3: 提交**

```bash
git add js/ui/HomePage.js
git commit -m "chore: remove dead code from HomePage.js (drawTaskCard, unused callbacks)"
```

---

### Task 9: 删除 TaskManager.js 无用方法

**Files:**
- Modify: `js/TaskManager.js`

- [ ] **Step 1: 确认无用方法无外部调用**

```bash
grep -n "getCompletedCount\|completeTask" js/TaskManager.js js/main.js js/ui/HomePage.js js/ui/TaskPage.js
```

- [ ] **Step 2: 删除 getCompletedCount() 和 completeTask()**

删除 `getCompletedCount` 方法和 `completeTask` 方法。

- [ ] **Step 3: 提交**

```bash
git add js/TaskManager.js
git commit -m "chore: remove dead code from TaskManager.js (unused methods)"
```

---

### Task 10: 删除 BannerAdManager.destroy() 和 render.js

**Files:**
- Modify: `js/ads/BannerAdManager.js`
- Delete: `js/render.js`

- [ ] **Step 1: 确认 destroy() 无外部调用**

```bash
grep -n "destroy" js/ads/BannerAdManager.js js/main.js js/ui/HomePage.js
```

- [ ] **Step 2: 从 BannerAdManager.js 删除 destroy() 方法**

- [ ] **Step 3: 删除 js/render.js**

```bash
git rm js/render.js
```

- [ ] **Step 4: 提交**

```bash
git add js/ads/BannerAdManager.js
git rm js/render.js
git commit -m "chore: remove dead code (BannerAdManager.destroy, empty render.js)"
```

---

### Task 11: 清理 constants.js 未用 export

**Files:**
- Modify: `js/utils/constants.js`
- Modify: `js/GrowthSystem.js`

- [ ] **Step 1: 从 constants.js 删除未用 export**

删除 `ACCESSORY_TYPES`、`LULU_ACTIONS`、`STORAGE_KEYS_V2` 的 export 和定义。

- [ ] **Step 2: 更新 GrowthSystem.js 的 require**

将 `ACCESSORY_TYPES` 从 require 中移除。

- [ ] **Step 3: 验证测试通过**

```bash
node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js
```

- [ ] **Step 4: 提交**

```bash
git add js/utils/constants.js js/GrowthSystem.js
git commit -m "chore: remove unused exports from constants.js (ACCESSORY_TYPES, LULU_ACTIONS, STORAGE_KEYS_V2)"
```

---

## 子项目 4: 架构优化

### Task 12: WishManager 解耦（消除 setGoalsRef 耦合）

**Files:**
- Modify: `js/WishManager.js`
- Modify: `js/main.js`
- Modify: `js/__tests__/WishManager.test.js`

- [ ] **Step 1: 更新 WishManager.js — completeWish 移除目标写操作**

删除 `setGoalsRef` 方法和 `this._goals` 字段。

修改 `completeWish` 方法，移除对 `goal.lastDoneAt`、`goal.currentProgress`、`goal.completed` 的修改。

新的 `completeWish` 逻辑：
1. 找到对应心愿，标记 `wish.completed = true`
2. 用 `goalId` 查找关联目标（通过 `_goals` 引用，但只读）
3. 返回奖励信息（含 `goalId`，不含目标写操作）
4. 目标状态变更完全由调用方（main.js）处理

```js
// 新的 completeWish 返回值增加 goalId 字段
return {
  xp: wish.xp + 5,
  moodBoost: 15 + wish.extraMoodBoost,
  loveStar: 1,
  goalId: wish.goalId,  // 新增：让 main.js 知道改哪个目标
  goalCompleted: false, // 占位，main.js 会重新查询
};
```

- [ ] **Step 2: 更新 main.js — completeGoal 中处理目标状态变更**

在 `completeGoal` 方法中，在调用 `wishManager.completeWish()` 之后，增加目标状态更新：

```js
// 目标状态更新（从 WishManager 移入此处）
const goal = this.goalManager.getGoalById(wish.goalId);
if (goal) {
  goal.lastDoneAt = this.goalManager.getTodayString();
  if (goal.type === 'milestone') {
    goal.currentProgress = Math.min(
      (goal.currentProgress || 0) + 1,
      goal.totalProgress
    );
    if (goal.currentProgress >= goal.totalProgress) {
      goal.completed = true;
    }
  }
  if (goal.type === 'oneTime') {
    goal.completed = true;
  }
  // 更新 wishReward.goalCompleted
  if (wishReward) {
    wishReward.goalCompleted = goal.completed;
  }
}
```

从 main.js 中删除 `wishManager.setGoalsRef()` 调用（constructor 中的 line 56）。

- [ ] **Step 3: 更新 WishManager.test.js — 修复回归**

修改 "completeWish: for milestone goal increments progress" 测试：

删除 `wm.setGoalsRef(goals)` 调用（line 80）。

修改断言：不再断言 `goals[0].currentProgress === 1`，改为：
```js
expect(wish.completed).toBe(true);
expect(reward.goalId).toBe('g1');
```

- [ ] **Step 4: 验证测试通过**

```bash
node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js
```

- [ ] **Step 5: 提交**

```bash
git add js/WishManager.js js/main.js js/__tests__/WishManager.test.js
git commit -m "refactor: decouple WishManager from GoalManager — move goal mutation to main.js.completeGoal"
```

---

### Task 13: 新增 GameCompleteGoal 集成测试

**Files:**
- Create: `js/__tests__/GameCompleteGoal.test.js`

- [ ] **Step 1: 编写集成测试**

```js
// js/__tests__/GameCompleteGoal.test.js
// 测试 main.js.completeGoal 完整流程（心愿+目标双流程）

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    Error: ${e.message}`); failed++; }
}
function expect(v) {
  return {
    toBe: (n) => { if (v !== n) throw new Error(`Expected ${n}, got ${v}`); },
    toBeTruthy: () => { if (!v) throw new Error(`Expected truthy, got ${v}`); },
    toBeFalsy: () => { if (v) throw new Error(`Expected falsy, got ${v}`); },
    toBeGreaterThan: (n) => { if (v <= n) throw new Error(`Expected > ${n}, got ${v}`); },
    toBeLessThan: (n) => { if (v >= n) throw new Error(`Expected < ${n}, got ${v}`); },
  };
}

console.log('\n=== GameCompleteGoal Integration Tests ===\n');

// Mock Storage
const mockStorage = {
  data: {},
  get: function(key) { return this.data[key]; },
  set: function(key, val) { this.data[key] = val; },
};

// Test: completeGoal marks wish done + goal updated
test('completeGoal: marks wish completed and updates goal state', () => {
  const { Game } = require('../main-test-stub'); // 见 Step 2
  // 完整测试在 Step 2 实现
});
```

**注意**: main.js 是 ES Module (`export default Game`)，需要创建测试桩文件以便直接 require。详细实现见 Step 2。

- [ ] **Step 2: 创建 main-test-stub.js 并实现集成测试**

由于 main.js 使用 `export default`，测试文件无法直接 require。需要创建测试桩。

先检查 main.js 是否有 `require` 兼容模式（查看文件头部是否为 CommonJS 或 ESM）。如为 ESM，创建简化桩：

```js
// js/__tests__/main-stub.js
// 简化 Game 类测试桩（只包含 completeGoal 核心逻辑）
const Storage = require('../Storage');
const GoalManager = require('../GoalManager');
const WishManager = require('../WishManager');
const GrowthSystem = require('../GrowthSystem');
const PetStateManager = require('../PetStateManager');

class GameTestStub {
  constructor() {
    this.storage = new Storage();
    this.goalManager = new GoalManager();
    this.wishManager = new WishManager();
    this.growth = new GrowthSystem();
    this.petStateManager = new PetStateManager();
    this.goalManager.setStorage(this.storage);
    this.wishManager.setStorage(this.storage);
    this.petStateManager.setStorage(this.storage);
  }
  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }
  completeGoal(goalId) {
    const commitments = this.goalManager.getTodayCommitments();
    const commit = commitments.find(c => c.goalId === goalId);
    if (!commit || commit.completed) return;
    this.goalManager.completeCommitment(goalId);
    const wish = this.wishManager.getTodayWishes().find(w => w.goalId === goalId);
    let wishReward = null;
    if (wish) {
      wishReward = this.wishManager.completeWish(wish.id);
    }
    // 目标状态更新（从 WishManager 移入此处）
    const goal = this.goalManager.getGoalById(wishReward?.goalId);
    if (goal) {
      goal.lastDoneAt = this.getTodayString();
      if (goal.type === 'milestone') {
        goal.currentProgress = Math.min((goal.currentProgress || 0) + 1, goal.totalProgress);
        if (goal.currentProgress >= goal.totalProgress) goal.completed = true;
      }
      if (goal.type === 'oneTime') goal.completed = true;
    }
    return { wishReward, goal };
  }
}
module.exports = { GameTestStub };
```

更新集成测试文件 `js/__tests__/GameCompleteGoal.test.js`，完整实现：

```js
// js/__tests__/GameCompleteGoal.test.js
const { GameTestStub } = require('./main-stub');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    Error: ${e.message}`); failed++; }
}
function expect(v) {
  return {
    toBe: (n) => { if (v !== n) throw new Error(`Expected ${n}, got ${v}`); },
    toBeTruthy: () => { if (!v) throw new Error(`Expected truthy, got ${v}`); },
    toBeFalsy: () => { if (v) throw new Error(`Expected falsy, got ${v}`); },
  };
}

console.log('\n=== GameCompleteGoal Integration Tests ===\n');

test('completeGoal: marks commitment done', () => {
  const g = new GameTestStub();
  const goal = g.goalManager.createGoal({ name: '测试', type: 'habit', xp: 15, icon: '📝', tag: '测试' });
  g.goalManager.commitGoal(goal.id);
  g.completeGoal(goal.id);
  const commitments = g.goalManager.getTodayCommitments();
  const c = commitments.find(x => x.goalId === goal.id);
  expect(c.completed).toBe(true);
});

test('completeGoal: marks wish done and returns reward', () => {
  const g = new GameTestStub();
  const goal = g.goalManager.createGoal({ name: '每天跑步', type: 'habit', xp: 20, icon: '🏃', tag: '运动' });
  g.goalManager.commitGoal(goal.id);
  g.wishManager.generateDailyWishes(g.goalManager.getGoals());
  const wish = g.wishManager.getTodayWishes()[0];
  const result = g.completeGoal(wish.goalId);
  expect(wish.completed).toBe(true);
  expect(result.wishReward).toBeTruthy();
  expect(result.wishReward.loveStar).toBe(1);
});

test('completeGoal: milestone goal increments progress', () => {
  const g = new GameTestStub();
  const goal = g.goalManager.createGoal({
    name: '跑完10公里', type: 'milestone', xp: 30, icon: '🏃',
    tag: '运动', totalProgress: 10, currentProgress: 0,
  });
  g.goalManager.commitGoal(goal.id);
  g.wishManager.generateDailyWishes(g.goalManager.getGoals());
  const wish = g.wishManager.getTodayWishes()[0];
  g.completeGoal(wish.goalId);
  const updated = g.goalManager.getGoalById(goal.id);
  expect(updated.currentProgress).toBe(1);
  expect(updated.completed).toBeFalsy(); // 1/10, not yet done
});

test('completeGoal: milestone goal completes when progress reached', () => {
  const g = new GameTestStub();
  const goal = g.goalManager.createGoal({
    name: '读完一本书', type: 'milestone', xp: 30, icon: '📖',
    tag: '学习', totalProgress: 1, currentProgress: 0,
  });
  g.goalManager.commitGoal(goal.id);
  g.wishManager.generateDailyWishes(g.goalManager.getGoals());
  const wish = g.wishManager.getTodayWishes()[0];
  g.completeGoal(wish.goalId);
  const updated = g.goalManager.getGoalById(goal.id);
  expect(updated.completed).toBe(true);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 3: 运行集成测试验证**

```bash
node js/__tests__/GameCompleteGoal.test.js
```

- [ ] **Step 4: 提交**

```bash
git add js/__tests__/GameCompleteGoal.test.js js/__tests__/main-stub.js
git commit -m "test: add GameCompleteGoal integration tests"
```

---

### Task 14: COOL_ACTIONS 数据源统一

**Files:**
- Modify: `js/utils/constants.js`
- Modify: `js/Lulu.js`

- [ ] **Step 1: 更新 constants.js — 给每个 COOL_ACTIONS 项加 duration 字段**

将 durations map 的值合并到 COOL_ACTIONS 结构中：

```js
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
```

- [ ] **Step 2: 更新 Lulu.js — 使用 COOL_ACTIONS**

文件开头 import：
```js
const { COOL_ACTIONS } = require('../utils/constants');
```

删除 `playCoolAction` 中的本地 durations map（line 820-823）。

修改 duration 设置逻辑：
```js
const allActions = [
  ...COOL_ACTIONS.normal,
  ...COOL_ACTIONS.advanced,
  ...COOL_ACTIONS.ultimate,
];
const action = allActions.find(a => a.id === actionId);
this._coolActionDuration = action ? action.duration : 120;
```

- [ ] **Step 3: 验证测试通过**

```bash
node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js
```

- [ ] **Step 4: 提交**

```bash
git add js/utils/constants.js js/Lulu.js
git commit -m "refactor: unify COOL_ACTIONS with Lulu.js durations — single source of truth"
```

---

### Task 15: 魔法数字命名常量

**Files:**
- Modify: `js/main.js`
- Modify: `js/ui/HomePage.js`
- Modify: `js/ui/TaskPage.js`

- [ ] **Step 1: 在 main.js 开头定义常量**

在 `require` 语句后、class 定义前：
```js
// 游戏常量
const ONLINE_XP_INTERVAL = 60000;    // 在线XP：每分钟+1
const COOL_ACTION_PROB = 0.3;       // 酷炫动作触发概率30%
const FRAME_FALLBACK_MS = 16;       // requestAnimationFrame兜底帧时长
```

替换使用处：
- `60000` (line 363) → `ONLINE_XP_INTERVAL`
- `0.3` (line 333) → `COOL_ACTION_PROB`
- `16` (line 24) → `FRAME_FALLBACK_MS`

- [ ] **Step 2: 在 HomePage.js 开头定义常量**

```js
// 游戏常量
const TAP_DISTANCE_THRESHOLD = 16;   // 触摸移动距离阈值
const TASK_PRESS_SCALE = 0.96;      // 任务卡片按下缩放比例
```

替换使用处：
- `16` (line 218) → `TAP_DISTANCE_THRESHOLD`
- `0.96` (line 198) → `TASK_PRESS_SCALE`

- [ ] **Step 3: 在 TaskPage.js 开头定义常量**

```js
// 游戏常量
const CARD_RADIUS = 12;             // 卡片圆角
```

替换使用处：
- `12` (lines 62, 68, 111) → `CARD_RADIUS`

- [ ] **Step 4: 验证测试通过**

```bash
node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js
```

- [ ] **Step 5: 提交**

```bash
git add js/main.js js/ui/HomePage.js js/ui/TaskPage.js
git commit -m "refactor: name magic numbers as constants"
```

---

## 最终验证

执行全部测试确认无回归：

```bash
node js/__tests__/WishManager.test.js && node js/__tests__/GoalManager.test.js && node js/__tests__/PetStateManager.test.js && node js/__tests__/GameCompleteGoal.test.js
```

预期：43 + 4 = 47 passed, 0 failed
