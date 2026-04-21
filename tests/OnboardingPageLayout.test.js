// 引导页布局与交互测试
// 运行: node tests/OnboardingPageLayout.test.js

const path = require('path');
const { getOnboardingCopy, getOnboardingLayoutSpec } = require('../js/ui/pageLayoutSpec');

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
    notToContain(unexpected) {
      if (String(value).includes(unexpected)) {
        throw new Error(`Expected value not to contain ${unexpected}, got ${value}`);
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
  const fillStyles = [];
  return {
    drawnTexts,
    fillStyles,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineWidth: 1,
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    closePath() {},
    arc() {},
    ellipse() {},
    roundRect() {},
    fillRect() {},
    fill() {
      fillStyles.push(this.fillStyle);
    },
    stroke() {},
    fillText(text) {
      drawnTexts.push(String(text));
    },
    save() {},
    restore() {},
    createLinearGradient() {
      return createFakeGradient();
    },
    createRadialGradient() {
      return createFakeGradient();
    },
  };
}

function loadOnboardingPageWithBannerSpy(bannerSpy) {
  const bannerModulePath = path.resolve(__dirname, '../js/ads/BannerAdManager.js');
  const onboardingPageModulePath = path.resolve(__dirname, '../js/ui/OnboardingPage.js');
  const bannerModule = require(bannerModulePath);
  const originalGetInstance = bannerModule.getInstance;

  delete require.cache[onboardingPageModulePath];
  bannerModule.getInstance = () => bannerSpy;
  const OnboardingPage = require(onboardingPageModulePath);

  return {
    OnboardingPage,
    restore() {
      delete require.cache[onboardingPageModulePath];
      bannerModule.getInstance = originalGetInstance;
    },
  };
}

console.log('\n=== OnboardingPageLayout Tests ===\n');

test('getOnboardingCopy: exposes onboarding runtime copy fields', () => {
  const copy = getOnboardingCopy();
  expect(copy.brandTitle).toBe('慢慢变乖鸭');
  expect(copy.subtitle).toBe('领一只会陪你慢慢变好的小鸭');
  expect(copy.heroEyebrow).toBe('今天开始，一起慢慢变好');
  expect(copy.namePrompt).toBe('给它起个名字');
  expect(copy.primaryButtonText).toBe('带它回家');
  expect(copy.goalPickerTitleTemplate).toBe('今天想和{duckName}一起坚持什么？');
  expect(copy.goalPickerSubtitleTemplate).toBe('先选一个目标，再带{duckName}回到首页');
  expect(copy.goalSuccessTemplate).toBe('你的第一个目标！{duckName}记住了！');
  expect(copy.defaultDuckName).toBe('小鸭');
  expect(copy.customGoalSuccessText).toBe('这个目标听起来就很棒！');
  expect(copy.inputModalCancelText).toBe('取消');
  expect(copy.customGoalCancelText).toBe('取消');
});

test('getOnboardingLayoutSpec: keeps a top-brand middle-pet bottom-action hierarchy', () => {
  const spec = getOnboardingLayoutSpec(375, 812);
  if (!(spec.heroTop < spec.petAreaTop)) {
    throw new Error(`Expected heroTop (${spec.heroTop}) < petAreaTop (${spec.petAreaTop})`);
  }
  if (!(spec.petAreaTop + spec.petAreaHeight <= spec.namingCardY)) {
    throw new Error(`Expected pet area bottom to stay above naming card`);
  }
  if (!(spec.petAreaHeight > spec.heroHeight)) {
    throw new Error(`Expected petAreaHeight (${spec.petAreaHeight}) > heroHeight (${spec.heroHeight})`);
  }
});

test('OnboardingPage.render: hides banner and does not show it', () => {
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
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.setLulu({
      update() {},
      drawPet() {},
    });

    page.render(createFakeCtx(), 375, 812);

    expect(bannerSpy.hideCalls).toBe(1);
    expect(bannerSpy.showCalls).toBe(0);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.render: draws adoption-page key copy on canvas', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.setLulu({
      update() {},
      drawPet() {},
    });
    const ctx = createFakeCtx();

    page.render(ctx, 375, 812);

    expect(ctx.drawnTexts.includes('慢慢变乖鸭')).toBe(true);
    expect(ctx.drawnTexts.includes('领一只会陪你慢慢变好的小鸭')).toBe(true);
    expect(ctx.drawnTexts.includes('带它回家')).toBe(true);
    expect(ctx.drawnTexts.includes('给它起个名字')).toBe(true);
    expect(ctx.drawnTexts.includes('点击按钮后，会继续进入今日目标选择')).toBe(true);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.render: reads key text from page.copy instead of relying on defaults', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.copy.brandTitle = '测试品牌标题';
    page.copy.subtitle = '测试副标题';
    page.copy.primaryButtonText = '测试主按钮';
    page.copy.goalPickerHint = '测试底部提示';
    page.setLulu({
      update() {},
      drawPet() {},
    });
    const ctx = createFakeCtx();

    page.render(ctx, 375, 812);

    expect(ctx.drawnTexts.includes('测试品牌标题')).toBe(true);
    expect(ctx.drawnTexts.includes('测试副标题')).toBe(true);
    expect(ctx.drawnTexts.includes('测试主按钮')).toBe(true);
    expect(ctx.drawnTexts.includes('测试底部提示')).toBe(true);
    expect(ctx.drawnTexts.includes('慢慢变乖鸭')).toBe(false);
    expect(ctx.drawnTexts.includes('领一只会陪你慢慢变好的小鸭')).toBe(false);
    expect(ctx.drawnTexts.includes('带它回家')).toBe(false);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.render: does not auto-open naming input on first paint', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalSetTimeout = global.setTimeout;

  try {
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    let promptCalls = 0;
    let timerCalls = 0;
    page.promptInput = () => {
      promptCalls += 1;
    };
    page.setLulu({
      update() {},
      drawPet() {},
    });
    global.setTimeout = () => {
      timerCalls += 1;
      return 1;
    };

    page.render(createFakeCtx(), 375, 812);

    expect(promptCalls).toBe(0);
    expect(timerCalls).toBe(0);
  } finally {
    global.setTimeout = originalSetTimeout;
    loader.restore();
  }
});

test('OnboardingPage.render: button visual changes between disabled and enabled states', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.setLulu({
      update() {},
      drawPet() {},
    });

    const disabledCtx = createFakeCtx();
    page.render(disabledCtx, 375, 812);

    page.setInputValue('团团');
    const enabledCtx = createFakeCtx();
    page.render(enabledCtx, 375, 812);

    expect(disabledCtx.fillStyles.includes('rgba(255, 179, 71, 0.4)')).toBe(true);
    expect(enabledCtx.fillStyles.includes('#FFB347')).toBe(true);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.onTouchStart: tapping naming card or primary button opens naming input', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    const layout = page._getLayout(375, 812);
    let promptCalls = 0;
    page.promptInput = () => {
      promptCalls += 1;
    };

    page.onTouchStart(layout.namingCardX + 20, layout.namingCardY + 20, 375, 812);
    page.onTouchStart(
      layout.buttonRect.x + layout.buttonRect.w / 2,
      layout.buttonRect.y + layout.buttonRect.h / 2,
      375,
      812
    );

    expect(promptCalls).toBe(2);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.onTouchStart: tapping primary button with confirmEnabled submits and opens goal picker', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const opened = [];
    const stored = [];
    const page = new loader.OnboardingPage({
      storage: {
        set(key, value) {
          stored.push({ key, value });
        },
      },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    const layout = page._getLayout(375, 812);
    page.goalPicker = {
      open(config) {
        opened.push(config);
      },
      render() {},
      handleClick() {
        return null;
      },
    };
    page.setInputValue('团团');

    page.onTouchStart(
      layout.buttonRect.x + layout.buttonRect.w / 2,
      layout.buttonRect.y + layout.buttonRect.h / 2,
      375,
      812
    );

    expect(stored).toEqual([]);
    expect(page.stage).toBe('goalPicker');
    expect(opened.length).toBe(1);
    expect(opened[0].title).toBe('今天想和团团一起坚持什么？');
  } finally {
    loader.restore();
  }
});

test('OnboardingPage._onConfirm: uses copy templates to open goal picker', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const opened = [];
    const stored = [];
    const page = new loader.OnboardingPage({
      storage: {
        set(key, value) {
          stored.push({ key, value });
        },
      },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.goalPicker = {
      open(config) {
        opened.push(config);
      },
      render() {},
      handleClick() {
        return null;
      },
    };
    page.copy.goalPickerTitleTemplate = '和{duckName}定下今天的小约定';
    page.copy.goalPickerSubtitleTemplate = '先选一个目标，再陪{duckName}开始第一天';
    page.setInputValue('团团');

    page._onConfirm();

    expect(stored).toEqual([]);
    expect(opened.length).toBe(1);
    expect(opened[0].title).toBe('和团团定下今天的小约定');
    expect(opened[0].subtitle).toBe('先选一个目标，再陪团团开始第一天');
    expect(page.stage).toBe('goalPicker');
  } finally {
    loader.restore();
  }
});

test('OnboardingPage._onConfirm: does not persist the duck name before the first goal is created', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const stored = [];
    const page = new loader.OnboardingPage({
      storage: {
        set(key, value) {
          stored.push({ key, value });
        },
      },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.goalPicker = {
      open() {},
      render() {},
      handleClick() {
        return null;
      },
    };
    page.setInputValue('团团');

    page._onConfirm();

    expect(stored).toEqual([]);
    expect(page.stage).toBe('goalPicker');
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.promptInput: cancel does not show validation toast', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const toastCalls = [];
    global.wx = {
      showModal(config) {
        config.success({ confirm: false, cancel: true, content: '' });
      },
      showToast(config) {
        toastCalls.push(config);
      },
    };
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });

    page.promptInput();

    expect(toastCalls.length).toBe(0);
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage.promptInput: wires modal title, placeholder, confirm, and cancel text from page.copy', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const modalCalls = [];
    global.wx = {
      showModal(config) {
        modalCalls.push(config);
      },
      showToast() {},
    };
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.copy.namePrompt = '测试命名标题';
    page.copy.inputModalPlaceholderText = '测试输入占位';
    page.copy.inputModalConfirmText = '测试确认按钮';
    page.copy.inputModalCancelText = '测试取消按钮';

    page.promptInput();

    expect(modalCalls.length).toBe(1);
    expect(modalCalls[0].title).toBe('测试命名标题');
    expect(modalCalls[0].placeholderText).toBe('测试输入占位');
    expect(modalCalls[0].confirmText).toBe('测试确认按钮');
    expect(modalCalls[0].cancelText).toBe('测试取消按钮');
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage.promptInput: invalid confirmed input shows toast text from page.copy', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const toastCalls = [];
    global.wx = {
      showModal(config) {
        config.success({ confirm: true, content: '   ' });
      },
      showToast(config) {
        toastCalls.push(config);
      },
    };
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.copy.inputValidationToast = '测试校验提示';

    page.promptInput();

    expect(toastCalls.length).toBe(1);
    expect(toastCalls[0].title).toBe('测试校验提示');
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage.promptInput: cancel keeps onboarding state unchanged', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const stored = [];
    const named = [];
    global.wx = {
      showModal(config) {
        config.success({ confirm: false, cancel: true, content: '' });
      },
      showToast() {},
    };
    const page = new loader.OnboardingPage({
      storage: {
        set(key, value) {
          stored.push({ key, value });
        },
      },
      createAndCommitGoal() {
        return null;
      },
      onNameSet(name) {
        named.push(name);
      },
    });

    page.promptInput();

    expect(stored.length).toBe(0);
    expect(named.length).toBe(0);
    expect(page.stage).toBe('naming');
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage._promptCustomGoal: uses copy-based modal title, placeholder, confirm, and cancel text', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const modalCalls = [];
    global.wx = {
      showModal(config) {
        modalCalls.push(config);
      },
      showToast() {},
    };
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.copy.customGoalModalTitle = '测试目标标题';
    page.copy.customGoalPlaceholder = '测试目标占位';
    page.copy.customGoalConfirmText = '测试开始';
    page.copy.customGoalCancelText = '稍后再说';

    page._promptCustomGoal();

    expect(modalCalls.length).toBe(1);
    expect(modalCalls[0].title).toBe('测试目标标题');
    expect(modalCalls[0].placeholderText).toBe('测试目标占位');
    expect(modalCalls[0].confirmText).toBe('测试开始');
    expect(modalCalls[0].cancelText).toBe('稍后再说');
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage._promptCustomGoal: empty confirmed input shows copy-based empty toast', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const toastCalls = [];
    global.wx = {
      showModal(config) {
        config.success({ confirm: true, content: '   ' });
      },
      showToast(config) {
        toastCalls.push(config);
      },
    };
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.copy.customGoalEmptyToast = '测试空值提示';

    page._promptCustomGoal();

    expect(toastCalls.length).toBe(1);
    expect(toastCalls[0].title).toBe('测试空值提示');
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage._promptCustomGoal: cancel does not show empty toast', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const toastCalls = [];
    global.wx = {
      showModal(config) {
        config.success({ confirm: false, cancel: true, content: '' });
      },
      showToast(config) {
        toastCalls.push(config);
      },
    };
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });

    page._promptCustomGoal();

    expect(toastCalls.length).toBe(0);
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage._promptCustomGoal: cancel keeps goal creation state unchanged', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    let createCalls = 0;
    const named = [];
    const toastCalls = [];
    global.wx = {
      showModal(config) {
        config.success({ confirm: false, cancel: true, content: '' });
      },
      showToast(config) {
        toastCalls.push(config);
      },
    };
    const page = new loader.OnboardingPage({
      storage: { set() {} },
      createAndCommitGoal() {
        createCalls += 1;
        return null;
      },
      onNameSet(name) {
        named.push(name);
      },
    });

    page._promptCustomGoal();

    expect(createCalls).toBe(0);
    expect(named.length).toBe(0);
    expect(toastCalls.length).toBe(0);
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage._handleGoalPickerAction: recommended goal success speech comes from copy template', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const said = [];
    const named = [];
    const stored = [];
    const page = new loader.OnboardingPage({
      storage: {
        set(key, value) {
          stored.push({ key, value });
        },
      },
      createAndCommitGoal(goal) {
        return goal;
      },
      onNameSet(name) {
        named.push(name);
      },
    });
    page.copy.goalSuccessTemplate = '测试成功文案：{duckName}已经收到目标';
    page.setLulu({
      say(message) {
        said.push(message);
      },
      update() {},
      drawPet() {},
    });

    page._handleGoalPickerAction({
      type: 'goal',
      goal: { name: '早睡', type: 'habit' },
    });

    expect(said.length).toBe(1);
    expect(said[0]).toBe('测试成功文案：小鸭已经收到目标');
    expect(stored).toEqual([]);
    expect(named.length).toBe(0);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage._handleGoalPickerAction: named success speech uses the real duck name instead of fallback', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const said = [];
    const named = [];
    const stored = [];
    const page = new loader.OnboardingPage({
      storage: {
        set(key, value) {
          stored.push({ key, value });
        },
      },
      createAndCommitGoal(goal) {
        return goal;
      },
      onNameSet(name) {
        named.push(name);
      },
    });
    page.copy.goalSuccessTemplate = '测试成功文案：{duckName}已经收到目标';
    page.setInputValue('团团');
    page.setLulu({
      say(message) {
        said.push(message);
      },
      update() {},
      drawPet() {},
    });

    page._handleGoalPickerAction({
      type: 'goal',
      goal: { name: '早睡', type: 'habit' },
    });

    expect(said.length).toBe(1);
    expect(said[0]).toBe('测试成功文案：团团已经收到目标');
    expect(stored).toEqual([{ key: 'lulu_name', value: '团团' }]);
    expect(named.length).toBe(1);
    expect(named[0]).toBe('团团');
  } finally {
    loader.restore();
  }
});

test('OnboardingPage._promptCustomGoal: successful custom goal speech comes from copy', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const said = [];
    const named = [];
    const stored = [];
    global.wx = {
      showModal(config) {
        config.success({ confirm: true, content: '晚饭后散步20分钟' });
      },
      showToast() {},
    };
    const page = new loader.OnboardingPage({
      storage: {
        set(key, value) {
          stored.push({ key, value });
        },
      },
      createAndCommitGoal(goal) {
        return goal;
      },
      onNameSet(name) {
        named.push(name);
      },
    });
    page.copy.customGoalSuccessText = '测试自定义目标成功提示';
    page.setLulu({
      say(message) {
        said.push(message);
      },
      update() {},
      drawPet() {},
    });

    page._promptCustomGoal();

    expect(said.length).toBe(1);
    expect(said[0]).toBe('测试自定义目标成功提示');
    expect(stored).toEqual([]);
    expect(named.length).toBe(0);
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage._promptCustomGoal: successful custom goal persists the chosen duck name after creation', () => {
  const bannerSpy = { hide() {}, show() {} };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const said = [];
    const named = [];
    const stored = [];
    global.wx = {
      showModal(config) {
        config.success({ confirm: true, content: '晚饭后散步20分钟' });
      },
      showToast() {},
    };
    const page = new loader.OnboardingPage({
      storage: {
        set(key, value) {
          stored.push({ key, value });
        },
      },
      createAndCommitGoal(goal) {
        return goal;
      },
      onNameSet(name) {
        named.push(name);
      },
    });
    page.setInputValue('团团');
    page.copy.customGoalSuccessText = '测试自定义目标成功提示';
    page.setLulu({
      say(message) {
        said.push(message);
      },
      update() {},
      drawPet() {},
    });

    page._promptCustomGoal();

    expect(said.length).toBe(1);
    expect(said[0]).toBe('测试自定义目标成功提示');
    expect(stored).toEqual([{ key: 'lulu_name', value: '团团' }]);
    expect(named.length).toBe(1);
    expect(named[0]).toBe('团团');
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
