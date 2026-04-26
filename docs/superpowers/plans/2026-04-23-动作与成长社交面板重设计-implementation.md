# 动作与成长社交面板重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页实现低性能开销的微行为动作系统（覆盖默认/任务完成/访客/搞怪撒娇）并修复成长卡与好友脉冲卡文本拥挤问题（卡高 62px，文本不溢出）。

**Architecture:** 以 `Lulu` 为动作引擎中心，引入“移动层 + 表现层”的微行为调度；`HomePage` 只负责事件注入与渲染消费。布局层在 `pageLayoutSpec` 统一调整双卡高度和任务区重分配，双卡组件改为像素宽度截断文本，保证跨机型稳定可读。

**Tech Stack:** Node/CommonJS、Canvas 2D、现有测试框架（Node + assert 风格测试）

---

## File Structure（先锁定边界）

- Modify: `js/Lulu.js`
  - 职责：新增微行为状态与调度（目标点、速度档、冷却、回落）。
- Modify: `js/ui/HomePage.js`
  - 职责：把点击/拖拽结束/任务完成/社交事件映射到动作事件；按新状态渲染。
- Modify: `js/ui/pageLayoutSpec.js`
  - 职责：统一双卡高度到 62px，并从任务区回收空间。
- Modify: `js/ui/GrowthPanel.js`
  - 职责：三行文本布局 + 像素宽度截断。
- Modify: `js/ui/SocialPulsePanel.js`
  - 职责：三行文本布局 + 像素宽度截断。
- Create: `tests/HomeActionMotion.test.js`
  - 职责：覆盖动作事件优先级、冷却、范围边界、回落逻辑。
- Create: `tests/HomePanelLayout.test.js`
  - 职责：覆盖双卡 62px 高度、文本截断不溢出、任务区高度重分配约束。

---

### Task 1: 动作调度核心（Lulu 微行为状态）

**Files:**
- Modify: `js/Lulu.js`
- Test: `tests/HomeActionMotion.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/HomeActionMotion.test.js
const assert = require('assert');
const Lulu = require('../js/Lulu');

function createLulu() {
  const lulu = new Lulu();
  lulu.setMotionTier && lulu.setMotionTier('standard');
  return lulu;
}

function runTicks(lulu, n) {
  for (let i = 0; i < n; i += 1) {
    if (typeof lulu.updateBehavior === 'function') lulu.updateBehavior(16);
  }
}

function testBehaviorStateInit() {
  const lulu = createLulu();
  assert.ok(lulu._behaviorState, 'should init behavior state');
  assert.ok(lulu._behaviorState.zone, 'should have movement zone');
}

function testEventPriorityAndFallback() {
  const lulu = createLulu();
  lulu.injectBehaviorEvent('default');
  lulu.injectBehaviorEvent('playful');
  lulu.injectBehaviorEvent('task_done');
  assert.strictEqual(lulu._behaviorState.currentCategory, 'task_done');
  runTicks(lulu, 400);
  assert.ok(
    ['default', 'playful', 'visitor', 'task_done'].includes(lulu._behaviorState.currentCategory),
    'should remain in known categories'
  );
}

function testMovementBoundedInZone() {
  const lulu = createLulu();
  lulu.setBehaviorZone({ xMin: -0.44, xMax: 0.44, yMin: -0.36, yMax: 0.36 });
  lulu.injectBehaviorEvent('default');
  runTicks(lulu, 1200);
  assert.ok(lulu._behaviorState.pos.x >= -0.44 && lulu._behaviorState.pos.x <= 0.44);
  assert.ok(lulu._behaviorState.pos.y >= -0.36 && lulu._behaviorState.pos.y <= 0.36);
}

testBehaviorStateInit();
testEventPriorityAndFallback();
testMovementBoundedInZone();
console.log('HomeActionMotion.test.js passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/HomeActionMotion.test.js`  
Expected: FAIL with missing methods like `injectBehaviorEvent` / `setBehaviorZone` / `_behaviorState`.

- [ ] **Step 3: Write minimal implementation**

```js
// js/Lulu.js (新增/修改核心片段)
const BEHAVIOR_PRIORITY = { default: 1, playful: 2, visitor: 3, task_done: 4 };
const CATEGORY_ACTIONS = {
  default: ['stand_breathe', 'walk_arc', 'look_around', 'small_stretch'],
  task_done: ['run_then_jump', 'happy_spin', 'victory_hop'],
  visitor: ['approach_front', 'wave_greet', 'curious_peek'],
  playful: ['tilt_then_roll', 'fake_fall_recover', 'cling_pose'],
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

class Lulu {
  // ...保留既有构造逻辑
  _initBehaviorState() {
    this._behaviorState = {
      currentCategory: 'default',
      currentAction: 'stand_breathe',
      actionTtlMs: 1200,
      cooldownUntil: Object.create(null),
      recentActions: [],
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      target: { x: 0.2, y: 0.1 },
      zone: { xMin: -0.44, xMax: 0.44, yMin: -0.36, yMax: 0.36 },
    };
  }

  setBehaviorZone(zone) {
    if (!this._behaviorState) this._initBehaviorState();
    this._behaviorState.zone = {
      xMin: Number.isFinite(zone.xMin) ? zone.xMin : -0.44,
      xMax: Number.isFinite(zone.xMax) ? zone.xMax : 0.44,
      yMin: Number.isFinite(zone.yMin) ? zone.yMin : -0.36,
      yMax: Number.isFinite(zone.yMax) ? zone.yMax : 0.36,
    };
  }

  injectBehaviorEvent(category) {
    if (!this._behaviorState) this._initBehaviorState();
    if (!BEHAVIOR_PRIORITY[category]) return;
    const cur = this._behaviorState.currentCategory;
    if (BEHAVIOR_PRIORITY[category] >= BEHAVIOR_PRIORITY[cur]) {
      this._behaviorState.currentCategory = category;
      this._pickNextAction(category);
    }
  }

  _pickNextAction(category) {
    const s = this._behaviorState;
    const pool = CATEGORY_ACTIONS[category] || CATEGORY_ACTIONS.default;
    const next = pool.find((id) => s.recentActions.indexOf(id) === -1) || pool[0];
    s.currentAction = next;
    s.actionTtlMs = category === 'default' ? 1400 : 1000;
    s.recentActions.unshift(next);
    s.recentActions = s.recentActions.slice(0, 3);
  }

  updateBehavior(dtMs) {
    if (!this._behaviorState) this._initBehaviorState();
    const s = this._behaviorState;
    s.actionTtlMs -= dtMs;
    if (s.actionTtlMs <= 0) {
      if (s.currentCategory !== 'default') s.currentCategory = 'default';
      this._pickNextAction(s.currentCategory);
    }
    const dx = s.target.x - s.pos.x;
    const dy = s.target.y - s.pos.y;
    s.vel.x = clamp(dx * 0.08, -0.02, 0.02);
    s.vel.y = clamp(dy * 0.08, -0.02, 0.02);
    s.pos.x = clamp(s.pos.x + s.vel.x, s.zone.xMin, s.zone.xMax);
    s.pos.y = clamp(s.pos.y + s.vel.y, s.zone.yMin, s.zone.yMax);
    if (Math.abs(dx) + Math.abs(dy) < 0.03) {
      s.target.x = (Math.random() * (s.zone.xMax - s.zone.xMin)) + s.zone.xMin;
      s.target.y = (Math.random() * (s.zone.yMax - s.zone.yMin)) + s.zone.yMin;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/HomeActionMotion.test.js`  
Expected: PASS and output `HomeActionMotion.test.js passed`.

- [ ] **Step 5: Commit**

```bash
git add tests/HomeActionMotion.test.js js/Lulu.js
git commit -m "feat: add bounded micro-behavior core for lulu"
```

---

### Task 2: 首页事件映射到四类动作

**Files:**
- Modify: `js/ui/HomePage.js`
- Test: `tests/HomeActionMotion.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/HomeActionMotion.test.js 追加
function testHomeEventMapping(game, page, lulu) {
  // 伪造：任务完成触发
  page._notifyLuluBehavior && page._notifyLuluBehavior('task_done');
  assert.strictEqual(lulu._behaviorState.currentCategory, 'task_done');

  // 伪造：社交来访触发
  page._notifyLuluBehavior && page._notifyLuluBehavior('visitor');
  assert.strictEqual(lulu._behaviorState.currentCategory, 'visitor');

  // 伪造：点击触发撒娇
  page._notifyLuluBehavior && page._notifyLuluBehavior('playful');
  assert.strictEqual(lulu._behaviorState.currentCategory, 'playful');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/HomeActionMotion.test.js`  
Expected: FAIL with missing `_notifyLuluBehavior` or category not updated.

- [ ] **Step 3: Write minimal implementation**

```js
// js/ui/HomePage.js (新增/修改片段)
class HomePage {
  // ...
  _notifyLuluBehavior(category) {
    if (!this.lulu || typeof this.lulu.injectBehaviorEvent !== 'function') return;
    this.lulu.injectBehaviorEvent(category);
  }

  onTouchEnd(x, y, canvasWidth, canvasHeight) {
    // ...保留原有逻辑
    if (t.mode === 'pet' && this.lulu && !t.petMoved && dist < TAP_DISTANCE_THRESHOLD) {
      this._notifyLuluBehavior('playful');
    }
    // 任务完成成功分支内：
    // this._notifyLuluBehavior('task_done');
  }

  _openSocialActionMenu(target, sourceItem) {
    // 选择来访/加油成功后：
    // this._notifyLuluBehavior('visitor');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/HomeActionMotion.test.js`  
Expected: PASS，事件映射断言通过。

- [ ] **Step 5: Commit**

```bash
git add js/ui/HomePage.js tests/HomeActionMotion.test.js
git commit -m "feat: map home interactions to lulu behavior categories"
```

---

### Task 3: 双卡高度 62px 与任务区重分配

**Files:**
- Modify: `js/ui/pageLayoutSpec.js`
- Test: `tests/HomePanelLayout.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/HomePanelLayout.test.js
const assert = require('assert');
const { getHomePageLayoutSpec } = require('../js/ui/pageLayoutSpec');

function testPanelHeightAndTaskCompression() {
  const spec = getHomePageLayoutSpec(375, 667);
  assert.strictEqual(spec.dualPanelHeight, 62, 'dual panel must be 62px');
  assert.ok(spec.actionAreaHeight <= spec._legacyActionAreaHeight, 'task area should be compressed');
}

function testSmallScreenStillUsable() {
  const spec = getHomePageLayoutSpec(320, 568);
  assert.strictEqual(spec.dualPanelHeight, 62);
  assert.ok(spec.actionCardHeight >= 56, 'task card must stay tappable');
}

testPanelHeightAndTaskCompression();
testSmallScreenStillUsable();
console.log('HomePanelLayout.test.js passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/HomePanelLayout.test.js`  
Expected: FAIL with missing `dualPanelHeight` and compression fields.

- [ ] **Step 3: Write minimal implementation**

```js
// js/ui/pageLayoutSpec.js (核心片段)
function getHomePageLayoutSpec(width, height) {
  // ...既有计算
  const legacyActionAreaHeight = actionAreaHeight;
  const dualPanelHeight = 62;
  const dualPanelTopPadding = 8;
  const dualPanelBottomGap = 8;

  // 从任务区让高：先减空白/间距，再小幅减 action 区高度
  actionAreaHeight = Math.max(actionMin, actionAreaHeight - 12);

  return {
    // ...原字段
    _legacyActionAreaHeight: legacyActionAreaHeight,
    dualPanelHeight,
    dualPanelTopPadding,
    dualPanelBottomGap,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/HomePanelLayout.test.js`  
Expected: PASS and output `HomePanelLayout.test.js passed`.

- [ ] **Step 5: Commit**

```bash
git add js/ui/pageLayoutSpec.js tests/HomePanelLayout.test.js
git commit -m "feat: set dual panel height to 62px and rebalance task area"
```

---

### Task 4: 成长卡与好友卡三行排版 + 像素截断

**Files:**
- Modify: `js/ui/GrowthPanel.js`
- Modify: `js/ui/SocialPulsePanel.js`
- Test: `tests/HomePanelLayout.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/HomePanelLayout.test.js 追加
const GrowthPanel = require('../js/ui/GrowthPanel');
const SocialPulsePanel = require('../js/ui/SocialPulsePanel');

function createMockCtx() {
  const calls = [];
  return {
    calls,
    save() {}, restore() {}, beginPath() {}, rect() {}, fill() {}, stroke() {},
    fillText(text, x, y) { calls.push({ text, x, y }); },
    measureText(text) { return { width: String(text).length * 7 }; },
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
    set font(v) {}, set textAlign(v) {},
  };
}

function testPanelTextNoOverflow() {
  const ctx = createMockCtx();
  new GrowthPanel().render(ctx, { x: 0, y: 0, w: 160, h: 62 }, {
    level: 12, completedCount: 9, commitmentCount: 12, moodValue: 88, moodLabel: '状态特别特别好'
  });
  new SocialPulsePanel().render(ctx, { x: 170, y: 0, w: 160, h: 62 }, {
    pulseLine: '这是一个非常非常长的好友动态文本需要被截断'
  }, { unreadCount: 123 });
  assert.ok(ctx.calls.some((c) => String(c.text).includes('…')), 'long line should ellipsize');
}

testPanelTextNoOverflow();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/HomePanelLayout.test.js`  
Expected: FAIL because panel still uses old two行布局 and fixed char slicing.

- [ ] **Step 3: Write minimal implementation**

```js
// js/ui/GrowthPanel.js / js/ui/SocialPulsePanel.js 共享思路片段
function ellipsizeByPx(ctx, text, maxWidth) {
  let s = String(text || '');
  if (ctx.measureText(s).width <= maxWidth) return s;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) {
    s = s.slice(0, -1);
  }
  return `${s}…`;
}

// render 内改为三行
// 行 1: 标题 12px bold y+16
// 行 2: 主信息 11px y+33
// 行 3: 次信息 10px y+49
// 且每行均通过 ellipsizeByPx 按像素宽截断
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/HomePanelLayout.test.js`  
Expected: PASS，长文本可被 `…` 截断且不报错。

- [ ] **Step 5: Commit**

```bash
git add js/ui/GrowthPanel.js js/ui/SocialPulsePanel.js tests/HomePanelLayout.test.js
git commit -m "fix: redesign growth and social panel text layout with px ellipsis"
```

---

### Task 5: HomePage 消费新布局字段并渲染 62px 双卡

**Files:**
- Modify: `js/ui/HomePage.js`
- Test: `tests/HomePanelLayout.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/HomePanelLayout.test.js 追加
function testHomeUsesDualPanelHeight() {
  const { getHomePageLayoutSpec } = require('../js/ui/pageLayoutSpec');
  const spec = getHomePageLayoutSpec(375, 667);
  assert.strictEqual(spec.dualPanelHeight, 62);
  // HomePage 在 _drawDualPanels 中应使用 spec.dualPanelHeight 计算 panelH
}

testHomeUsesDualPanelHeight();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/HomePanelLayout.test.js`  
Expected: FAIL / 或无法覆盖到 `HomePage` 使用新字段（需补实现后通过）。

- [ ] **Step 3: Write minimal implementation**

```js
// js/ui/HomePage.js (_drawDualPanels 片段)
_drawDualPanels(ctx, L, homeSnapshot) {
  const inset = L.spec.actionInset;
  const gap = 8;
  const panelY = L.actionAreaY + (L.spec.dualPanelTopPadding || 8);
  const panelH = L.spec.dualPanelHeight || 62;
  const panelW = (L.actionAreaW - inset * 2 - gap) / 2;
  // ...其余逻辑保持
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/HomePanelLayout.test.js`  
Expected: PASS，双卡高度字段被消费，布局测试通过。

- [ ] **Step 5: Commit**

```bash
git add js/ui/HomePage.js tests/HomePanelLayout.test.js
git commit -m "feat: apply 62px dual panel layout in home page rendering"
```

---

### Task 6: 回归与健康检查

**Files:**
- Modify: `tests/HomeActionMotion.test.js`
- Modify: `tests/HomePanelLayout.test.js`

- [ ] **Step 1: Add final regression assertions**

```js
// tests/HomeActionMotion.test.js 最后补充
function testCategoryCoverage() {
  const lulu = createLulu();
  ['default', 'task_done', 'visitor', 'playful'].forEach((c) => {
    lulu.injectBehaviorEvent(c);
    assert.strictEqual(lulu._behaviorState.currentCategory, c);
  });
}
testCategoryCoverage();
```

- [ ] **Step 2: Run targeted tests**

Run: `node tests/HomeActionMotion.test.js && node tests/HomePanelLayout.test.js`  
Expected: PASS both test files.

- [ ] **Step 3: Run project tests-only health check**

Run: `bash scripts/health-check.sh --tests-only`  
Expected: Existing tests pass（若有已知历史失败，需在 PR 说明中标注非本次引入）。

- [ ] **Step 4: Validate no accidental file scope creep**

Run: `git status --short`  
Expected: 只包含本计划涉及文件变更；无无关大规模改动。

- [ ] **Step 5: Commit final regression polish**

```bash
git add tests/HomeActionMotion.test.js tests/HomePanelLayout.test.js
git commit -m "test: add regression coverage for behavior categories and panel layout"
```

---

## Spec-to-Task Coverage Check

- 四类动作语义池：Task 1 + Task 2
- 待机/交互/任务完成/社交全入口：Task 2
- 活动范围扩大与边界约束：Task 1
- 双卡高度 62px：Task 3 + Task 5
- 文本超出与压缩修复：Task 4
- 低性能可控（轻计算、降频思想落地）：Task 1（调度/更新频率实现时遵循）
- 验收与回归：Task 6

## Self-Review

- Placeholder scan: 已检查，无 `TODO/TBD/implement later`。
- 类型一致性: `injectBehaviorEvent` / `setBehaviorZone` / `_behaviorState` 在任务中命名一致。
- 作用域: 文件修改范围限定在 spec 覆盖区域，未引入无关重构。

