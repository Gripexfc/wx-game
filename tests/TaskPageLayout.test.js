// 任务页布局与交互测试
// 运行: node tests/TaskPageLayout.test.js

const path = require('path');
const { getTaskPageCopy, getTaskPageLayoutSpec } = require('../js/ui/pageLayoutSpec');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
  };
}

function createFakeGradient() {
  return {
    addColorStop() {},
  };
}

function createFakeCtx() {
  const drawnTexts = [];
  return {
    drawnTexts,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    lineWidth: 1,
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    closePath() {},
    roundRect() {},
    fillRect() {},
    fill() {},
    stroke() {},
    fillText(text) {
      drawnTexts.push(String(text));
    },
    createLinearGradient() {
      return createFakeGradient();
    },
  };
}

function loadTaskPageWithBannerSpy(bannerSpy) {
  const bannerModulePath = path.resolve(__dirname, '../js/ads/BannerAdManager.js');
  const taskPageModulePath = path.resolve(__dirname, '../js/ui/TaskPage.js');
  const bannerModule = require(bannerModulePath);
  const originalGetInstance = bannerModule.getInstance;

  delete require.cache[taskPageModulePath];
  bannerModule.getInstance = () => bannerSpy;
  const TaskPage = require(taskPageModulePath);

  return {
    TaskPage,
    restore() {
      delete require.cache[taskPageModulePath];
      bannerModule.getInstance = originalGetInstance;
    },
  };
}

function createTaskManagerStub() {
  return {
    getTotalXp() {
      return 18;
    },
    getDailyCustom() {
      return null;
    },
    getTodayTasks() {
      return [
        { id: 'fitness', name: '动一动', icon: '🏃', xp: 8, desc: '舒展一下身体', completed: false },
        { id: 'read', name: '读几页', icon: '📚', xp: 10, desc: '让脑袋慢下来', completed: true },
        { id: '__daily_placeholder__', name: '我的小目标', icon: '✏️', xp: 0, desc: '点一下写一句', completed: false, isPlaceholder: true },
      ];
    },
    setDailyCustom() {
      return true;
    },
  };
}

console.log('\n=== TaskPageLayout Tests ===\n');

test('getTaskPageCopy: exposes companion-style title and summary', () => {
  const copy = getTaskPageCopy('团团');
  expect(copy.title).toBe('团团今天的小计划');
  expect(copy.summary).toBe('做完一件，就离慢慢变好更近一点');
});

test('getTaskPageLayoutSpec: keeps a breathable header-summary-list hierarchy', () => {
  const spec = getTaskPageLayoutSpec(375, 812);
  expect(spec.showBottomBanner).toBe(false);
  if (!(spec.listTop > spec.topPadding + spec.headerHeight)) {
    throw new Error(`Expected listTop (${spec.listTop}) below header bottom (${spec.topPadding + spec.headerHeight})`);
  }
  if (!(spec.taskCardGap >= 12)) {
    throw new Error(`Expected taskCardGap (${spec.taskCardGap}) to stay breathable`);
  }
  if (!(spec.taskCardHeight > 70)) {
    throw new Error(`Expected taskCardHeight (${spec.taskCardHeight}) to stay comfortably tall`);
  }
});

test('TaskPage.render: hides banner and draws companion schedule copy', () => {
  const bannerSpy = {
    hideCalls: 0,
    showCalls: 0,
    hide() {
      this.hideCalls += 1;
    },
    show() {
      this.showCalls += 1;
    },
  };
  const loader = loadTaskPageWithBannerSpy(bannerSpy);

  try {
    const ctx = createFakeCtx();
    const page = new loader.TaskPage({
      taskManager: createTaskManagerStub(),
      getLuluName() {
        return '团团';
      },
      completeGoal() {},
      saveData() {},
    });

    page.render(ctx, 375, 812);

    expect(bannerSpy.hideCalls).toBe(1);
    expect(bannerSpy.showCalls).toBe(0);
    expect(ctx.drawnTexts.includes('团团今天的小计划')).toBe(true);
    expect(ctx.drawnTexts.includes('做完一件，就离慢慢变好更近一点')).toBe(true);
    expect(ctx.drawnTexts.includes('添加今天的小计划')).toBe(true);
  } finally {
    loader.restore();
  }
});

test('TaskPage.handleClick: placeholder card still opens custom task editor', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadTaskPageWithBannerSpy(bannerSpy);

  try {
    let editorCalls = 0;
    const page = new loader.TaskPage({
      taskManager: createTaskManagerStub(),
      getLuluName() {
        return '团团';
      },
      completeGoal() {},
      saveData() {},
    });
    page.openCustomTaskEditor = () => {
      editorCalls += 1;
    };
    page.taskButtons = [
      { x: 20, y: 200, width: 300, height: 80, task: { id: '__daily_placeholder__', isPlaceholder: true, completed: false } },
    ];

    page.handleClick(40, 220);

    expect(editorCalls).toBe(1);
  } finally {
    loader.restore();
  }
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
