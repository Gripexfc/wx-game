# 噜噜养成代码优化设计

> **状态**: 已评审（/plan-eng-review 通过）

## 目标

在不破坏现有功能和样式的前提下，优化代码结构：高内聚、低耦合、消除重复、删除无用代码。

---

## 子项目 1: 修复运行时 Bug（5个确认问题）

| # | 文件 | 问题 | 修复 |
|---|------|------|------|
| B1 | `js/ui/GalleryPage.js:32` | 调用 `lulu.draw()` 但 Lulu 类无此方法 | 改为 `lulu.drawPet(ctx, canvasWidth/2, 160, canvasWidth, 300)` |
| B2 | `js/ui/HomePage.js:231` | 调用 `game.completeTask()` 但 Game 类无此方法 | 改为 `game.completeGoal(task.id)` |
| B3 | `js/ui/TaskPage.js:136` | 同上 | 改为 `game.completeGoal(btn.task.id)` |
| B4 | `js/Lulu.js:125-128` | `say()` 方法定义了两遍，第二个覆盖第一个 | 删除第二个定义（125-128行），保留第一个 |
| B5 | `js/ui/GalleryPage.js:81`、`js/ui/TaskPage.js:144` | 调用 `game.showHomePage()` 但 Game 类无此方法 | 改为 `this.game.currentPage = 'home'` |

---

## 子项目 2: 清理 Dead Code

| 文件 | 删除内容 | 原因 |
|------|----------|------|
| `js/Lulu.js` | `getMoodLevelName()`、`onOwnerFinishedTask()`、`triggerRandomAction()`、`getUnlockedActions()`、`_applyMoodSaturation()`、`roundRect()`（line 674，未调用） | 从未被外部调用；`roundRect` 有重复实现 |
| `js/ui/HomePage.js` | `drawTaskCard()` 方法（line 613+）；`setGameSystems()` 中的 `_onCommitGoal` 和 `_onCreateGoal` 赋值（存了但从未触发） | 改用 `_drawCommitmentCard` 后原方法永不调用；回调从未被触发 |
| `js/TaskManager.js` | `getCompletedCount()`、`completeTask()`（被 `toggleTask` 替代） | 从未被调用 |
| `js/ads/BannerAdManager.js` | `destroy()` 方法 | 单例永不销毁 |
| `js/render.js` | 整文件（仅一行注释） | 空文件 |
| `js/utils/constants.js` | `ACCESSORY_TYPES`（GrowthSystem 导入了但未使用）、`LULU_ACTIONS`、`STORAGE_KEYS_V2` | 从未被 import |

**注意**: `RECOMMENDED_GOALS`（GoalManager 用）、`WISH_TEMPLATES`（WishManager 用）、`STORAGE_KEYS_V2`（已在 GoalManager/WishManager/PetStateManager 中通过 storage key 字符串字面量使用）已确认有用，不删除。

---

## 子项目 3: 消除重复实现

### 3.1 roundRect → `js/utils/canvas.js`

**现状**: 4个文件各自实现 `ctx.arcTo` 圆角矩形逻辑（HomePage、TaskPage、OnboardingPage 各一个，另有 Lulu 一个 `_roundRect`）。

```
js/utils/canvas.js  ← 新建
  canvasRoundRect(ctx, x, y, w, h, r)
```

调用方全部改为:
```js
const { canvasRoundRect } = require('../utils/canvas');
canvasRoundRect(ctx, x, y, w, h, r);
```

更新文件: HomePage.js（~25调用点）、TaskPage.js（3调用点）、OnboardingPage.js（4调用点）、Lulu.js（1调用点 `_roundRect` → `canvasRoundRect`）。

### 3.2 getTodayString / daysBetween → `js/utils/date.js`

**现状**: 6个文件各自实现 `getTodayString()`，GrowthSystem 多一个 `getYesterdayString()`，`main._daysBetween()` 逻辑相同但更通用。

```
js/utils/date.js  ← 新建
  getTodayString()     → 'YYYY-M-D'
  getYesterdayString() → 'YYYY-M-D'
  daysBetween(dateA, dateB) → number
```

各 manager 删除自己的 `getTodayString`/`getYesterdayString`，改 import。`main._daysBetween` 改用 `date.js` 的 `daysBetween`。

更新文件: GoalManager.js、WishManager.js、GrowthSystem.js、PetStateManager.js、TaskManager.js、main.js。

---

## 子项目 4: 架构优化

### 4.1 WishManager 解耦（消除可变数组引用）

**现状**: `WishManager` 通过 `setGoalsRef(goals)` 持有 `GoalManager.goals` 可变引用，`completeWish` 中直接修改目标状态。

**修复**:
1. 删除 `WishManager.setGoalsRef()` 和 `this._goals`
2. `WishManager.completeWish` 改为只做心愿标记（不修改目标），返回心愿奖励信息
3. 目标状态变更移至 `main.js.completeGoal`（其中已有 `goalManager.completeCommitment()` 调用）
4. `main.js` 不再调用 `wishManager.setGoalsRef()`

**测试更新**: `js/__tests__/WishManager.test.js`:
- 修改 milestone goal 测试：不再断言 `goals[0].currentProgress === 1`（该逻辑移至 main.js）
- 删除 `setGoalsRef` 调用

**新增测试**: `js/__tests__/GameCompleteGoal.test.js`:
- 基础目标完成: completeGoal → XP+心情+保存
- 心愿关联目标完成: completeGoal → 心愿完成 → 额外 XP+爱星奖励
- 里程碑目标完成: completeGoal → goal.completed = true

### 4.2 COOL_ACTIONS 数据源统一

**现状**: `Lulu.js` 有硬编码 `durations` map（9个动作），`constants.COOL_ACTIONS` 有结构但缺 `duration` 字段且是分层结构 `{ normal: [], advanced: [], ultimate: [] }`。

**修复**:
1. `constants.js` 中 `COOL_ACTIONS` 每个 action 加 `duration` 字段（从 Lulu.js 的 durations map 取值）
2. `Lulu.js` import `COOL_ACTIONS`，删除本地 `durations` map
3. `playCoolAction` 改为跨 tier 查找：

```js
const action = [...COOL_ACTIONS.normal, ...COOL_ACTIONS.advanced, ...COOL_ACTIONS.ultimate]
  .find(a => a.id === actionId);
this._coolActionDuration = action?.duration || 120;
```

### 4.3 魔法数字命名常量

| 文件 | 数字 | 常量名 | 值 |
|------|------|--------|-----|
| `main.js` | `60000` | `ONLINE_XP_INTERVAL` | 60000 |
| `main.js` | `0.3` | `COOL_ACTION_PROB` | 0.3 |
| `main.js` | `16` | `FRAME_FALLBACK_MS` | 16 |
| `HomePage.js` | `16` | `TAP_DISTANCE_THRESHOLD` | 16 |
| `HomePage.js` | `0.96` | `TASK_PRESS_SCALE` | 0.96 |
| `TaskPage.js` | `12` | `CARD_RADIUS` | 12 |

---

## 文件变更总览

| 操作 | 文件 |
|------|------|
| 新建 | `js/utils/canvas.js`、`js/utils/date.js`、`js/__tests__/GameCompleteGoal.test.js` |
| 修改 | `main.js`、`Lulu.js`、`HomePage.js`、`TaskPage.js`、`OnboardingPage.js`、`WishManager.js`、`GoalManager.js`、`GrowthSystem.js`、`PetStateManager.js`、`TaskManager.js`、`constants.js` |
| 删除（整文件） | `js/render.js` |

---

## 测试要求

- 现有 43 个测试全程通过
- `WishManager.test.js` 2处更新（milestone 测试描述+断言、删除 setGoalsRef 调用）
- `js/__tests__/GameCompleteGoal.test.js` 新增（集成测试）
- 每步修改后运行 `node js/__tests__/*.test.js` 验证
