// 页面品牌文案与布局 helper 测试
// 运行: node tests/PageBrandingLayout.test.js

const {
  getBrandCopy,
  getHomePageLayoutSpec,
  getHomePageCommitmentLayout,
  getOnboardingCopy,
  getOnboardingLayoutSpec,
  getTaskPageCopy,
} = require('../js/ui/pageLayoutSpec');
const path = require('path');

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
    toBe: (expected) => {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    notToContain: (unexpected) => {
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
  return {
    drawnTexts,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineWidth: 1,
    shadowColor: '',
    shadowBlur: 0,
    measureText(text) {
      const s = String(text);
      return { width: Math.max(8, s.length * 11) };
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    closePath() {},
    arc() {},
    ellipse() {},
    roundRect() {},
    fillRect() {},
    fill() {},
    stroke() {},
    fillText(text) {
      drawnTexts.push(String(text));
    },
    save() {},
    restore() {},
    translate() {},
    scale() {},
    createLinearGradient() {
      return createFakeGradient();
    },
    createRadialGradient() {
      return createFakeGradient();
    },
  };
}

function loadHomePageWithBannerSpy(bannerSpy) {
  const bannerModulePath = path.resolve(__dirname, '../js/ads/BannerAdManager.js');
  const homePageModulePath = path.resolve(__dirname, '../js/ui/HomePage.js');
  const bannerModule = require(bannerModulePath);
  const originalGetInstance = bannerModule.getInstance;

  delete require.cache[homePageModulePath];
  bannerModule.getInstance = () => bannerSpy;
  const HomePage = require(homePageModulePath);

  return {
    HomePage,
    restore() {
      delete require.cache[homePageModulePath];
      bannerModule.getInstance = originalGetInstance;
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

console.log('\n=== PageBrandingLayout Tests ===\n');

test('getBrandCopy: locks brand title and personalized home relation copy', () => {
  const copy = getBrandCopy('团团');
  expect(copy.brandTitle).toBe('慢慢变乖鸭');
  expect(copy.homeRelationshipLine).toBe('今天也和团团一起慢慢变好');
});

test('getBrandCopy: falls back to a sensible default duck name when input is empty', () => {
  const copy = getBrandCopy('   ');
  expect(copy.homeRelationshipLine).toBe('今天也和小鸭一起慢慢变好');
});

test('getHomePageLayoutSpec: keeps home banner-free while exposing three-part home sections', () => {
  const spec = getHomePageLayoutSpec(375, 812);
  expect(spec.showBottomBanner).toBe(false);
  expect(typeof spec.headerHeight).toBe('number');
  expect(typeof spec.petCardTop).toBe('number');
  expect(typeof spec.petCardHeight).toBe('number');
  expect(typeof spec.actionAreaTop).toBe('number');
});

test('getHomePageLayoutSpec: makes the pet card the visual center of the home screen', () => {
  const spec = getHomePageLayoutSpec(375, 812);
  if (!(spec.petCardHeight >= spec.headerHeight * 3)) {
    throw new Error(
      `Expected petCardHeight (${spec.petCardHeight}) to be at least 3x headerHeight (${spec.headerHeight})`
    );
  }
  if (!(spec.actionAreaTop > spec.petCardTop + spec.petCardHeight)) {
    throw new Error(
      `Expected actionAreaTop (${spec.actionAreaTop}) below pet card bottom (${spec.petCardTop + spec.petCardHeight})`
    );
  }
  if (!(spec.actionAreaHeight >= 160)) {
    throw new Error(`Expected actionAreaHeight (${spec.actionAreaHeight}) to leave meaningful room for actions`);
  }
});

test('getHomePageLayoutSpec: scales the three-part hierarchy on shorter screens too', () => {
  const compact = getHomePageLayoutSpec(320, 568);
  expect(compact.showBottomBanner).toBe(false);
  if (!(compact.petCardHeight >= compact.headerHeight * 3)) {
    throw new Error(
      `Expected compact petCardHeight (${compact.petCardHeight}) to be at least 3x headerHeight (${compact.headerHeight})`
    );
  }
  if (!(compact.actionAreaTop > compact.petCardTop + compact.petCardHeight)) {
    throw new Error(
      `Expected compact actionAreaTop (${compact.actionAreaTop}) below pet card bottom (${compact.petCardTop + compact.petCardHeight})`
    );
  }
  const petToActionGap = compact.actionAreaTop - (compact.petCardTop + compact.petCardHeight);
  if (!(petToActionGap >= 12)) {
    throw new Error(`Expected compact pet-to-action gap (${petToActionGap}) to stay breathable`);
  }
  if (!(compact.actionAreaTop < 568)) {
    throw new Error(`Expected compact actionAreaTop (${compact.actionAreaTop}) to stay within screen height`);
  }
  if (!(compact.actionAreaHeight >= 160)) {
    throw new Error(`Expected compact actionAreaHeight (${compact.actionAreaHeight}) to leave room for actions`);
  }
});

test('getHomePageCommitmentLayout: returns four commitment cards inside the action area', () => {
  const layout = getHomePageCommitmentLayout(375, 812);
  expect(layout.cards.length).toBe(4);
  layout.cards.forEach((card, index) => {
    if (card.x < layout.actionArea.x || card.y < layout.actionArea.y) {
      throw new Error(`Expected card ${index} to stay inside action area origin`);
    }
    if (card.x + card.w > layout.actionArea.x + layout.actionArea.w) {
      throw new Error(`Expected card ${index} right edge to stay inside action area`);
    }
    if (card.y + card.h > layout.actionArea.y + layout.actionArea.h) {
      throw new Error(`Expected card ${index} bottom edge to stay inside action area`);
    }
  });
});

test('getHomePageCommitmentLayout: places the second row below the first row', () => {
  const layout = getHomePageCommitmentLayout(375, 812);
  if (!(layout.cards[2].y > layout.cards[0].y)) {
    throw new Error(`Expected card 3 y (${layout.cards[2].y}) > card 1 y (${layout.cards[0].y})`);
  }
  if (!(layout.cards[3].y > layout.cards[1].y)) {
    throw new Error(`Expected card 4 y (${layout.cards[3].y}) > card 2 y (${layout.cards[1].y})`);
  }
});

test('HomePage.render: hides banner and does not show it again', () => {
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
  const loader = loadHomePageWithBannerSpy(bannerSpy);

  try {
    const HomePage = loader.HomePage;
    const page = new HomePage({
      growth: {
        level: 3,
        xp: 24,
        getXpForNextLevel() {
          return 100;
        },
        getXpProgress() {
          return 0.24;
        },
      },
      getLuluName() {
        return '团团';
      },
    });

    page.goalPicker = {
      visible: false,
      render() {},
      open() {},
      close() {},
      handleClick() {
        return null;
      },
    };

    page.render(createFakeCtx(), 375, 812);

    expect(bannerSpy.hideCalls).toBe(1);
    expect(bannerSpy.showCalls).toBe(0);
  } finally {
    loader.restore();
  }
});

test('getOnboardingCopy: exposes the new onboarding adoption copy', () => {
  const copy = getOnboardingCopy();
  expect(copy.brandTitle).toBe('慢慢变乖鸭');
  expect(copy.subtitle).toBe('领一只会陪你慢慢变好的小鸭');
  expect(copy.heroEyebrow).toBe('今天开始，一起慢慢变好');
  expect(copy.namePrompt).toBe('给它起个名字');
  expect(copy.nameReminder).toBe('名字会出现在首页，陪你一起坚持');
  expect(copy.inputPlaceholder).toBe('点击这里输入名字');
  expect(copy.primaryButtonText).toBe('带它回家');
  expect(copy.goalPickerHint).toBe('点击按钮后，会继续进入今日目标选择');
  expect(copy.goalPickerTitleTemplate).toBe('今天想和{duckName}一起坚持什么？');
  expect(copy.goalPickerSubtitleTemplate).toBe('先选一个目标，再带{duckName}回到首页');
  expect(copy.customGoalModalTitle).toBe('写一个今天的小目标');
  expect(copy.customGoalPlaceholder).toBe('比如：晚饭后散步20分钟');
  expect(copy.customGoalConfirmText).toBe('开始坚持');
  expect(copy.customGoalEmptyToast).toBe('先写一个目标名吧');
  expect(copy.inputModalPlaceholderText).toBe('最多10个字');
  expect(copy.inputModalConfirmText).toBe('确定');
  expect(copy.inputValidationToast).toBe('名字1-10个字哦');
});

test('getOnboardingLayoutSpec: keeps onboarding in a top-brand middle-pet bottom-action hierarchy', () => {
  const spec = getOnboardingLayoutSpec(375, 812);
  if (!(spec.heroTop < spec.petAreaTop)) {
    throw new Error(`Expected heroTop (${spec.heroTop}) to stay above petAreaTop (${spec.petAreaTop})`);
  }
  if (!(spec.petAreaTop + spec.petAreaHeight <= spec.namingCardY)) {
    throw new Error(
      `Expected pet area bottom (${spec.petAreaTop + spec.petAreaHeight}) to stay above naming card (${spec.namingCardY})`
    );
  }
  if (!(spec.petAreaHeight > spec.heroHeight)) {
    throw new Error(`Expected petAreaHeight (${spec.petAreaHeight}) to be greater than heroHeight (${spec.heroHeight})`);
  }
  if (!(spec.namingCardY + spec.namingCardH <= 812)) {
    throw new Error(`Expected naming card bottom (${spec.namingCardY + spec.namingCardH}) to stay inside the canvas`);
  }
});

test('OnboardingPage.render: hides banner and never shows it', () => {
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
    const OnboardingPage = loader.OnboardingPage;
    const page = new OnboardingPage({
      skipPetPickOnboarding: true,
      storage: {
        set() {},
      },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page._promptedOnce = true;
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

test('OnboardingPage.render: consumes runtime copy fields instead of hard-coded onboarding text', () => {
  const bannerSpy = {
    hide() {},
    show() {},
  };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const OnboardingPage = loader.OnboardingPage;
    const page = new OnboardingPage({
      skipPetPickOnboarding: true,
      storage: {
        set() {},
      },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page._promptedOnce = true;
    page.copy = {
      brandTitle: '测试品牌标题',
      subtitle: '测试副标题',
      heroEyebrow: '测试顶部提示',
      namePrompt: '测试命名提示',
      nameReminder: '测试命名说明',
      inputPlaceholder: '测试输入占位',
      primaryButtonText: '测试主按钮',
      goalPickerHint: '测试底部提示',
    };
    page.setLulu({
      update() {},
      drawPet() {},
    });
    const ctx = createFakeCtx();

    page.render(ctx, 375, 812);

    expect(ctx.drawnTexts.includes('测试品牌标题')).toBe(true);
    expect(ctx.drawnTexts.includes('测试副标题')).toBe(true);
    expect(ctx.drawnTexts.includes('测试顶部提示')).toBe(true);
    expect(ctx.drawnTexts.includes('测试命名提示')).toBe(true);
    expect(ctx.drawnTexts.includes('测试命名说明')).toBe(true);
    expect(ctx.drawnTexts.includes('测试输入占位')).toBe(true);
    expect(ctx.drawnTexts.includes('测试主按钮')).toBe(true);
    expect(ctx.drawnTexts.includes('测试底部提示')).toBe(true);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.render: does not auto-open naming input on first paint anymore', () => {
  const bannerSpy = {
    hide() {},
    show() {},
  };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalSetTimeout = global.setTimeout;

  try {
    const OnboardingPage = loader.OnboardingPage;
    const page = new OnboardingPage({
      skipPetPickOnboarding: true,
      storage: {
        set() {},
      },
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

test('OnboardingPage.onTouchStart: tapping primary button opens naming input when no name is set', () => {
  const bannerSpy = {
    hide() {},
    show() {},
  };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const OnboardingPage = loader.OnboardingPage;
    const page = new OnboardingPage({
      skipPetPickOnboarding: true,
      storage: {
        set() {},
      },
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

    page.onTouchStart(
      layout.buttonRect.x + layout.buttonRect.w / 2,
      layout.buttonRect.y + layout.buttonRect.h / 2,
      375,
      812
    );

    expect(promptCalls).toBe(1);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.onTouchStart: tapping anywhere on the naming card opens naming input', () => {
  const bannerSpy = {
    hide() {},
    show() {},
  };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const OnboardingPage = loader.OnboardingPage;
    const page = new OnboardingPage({
      skipPetPickOnboarding: true,
      storage: {
        set() {},
      },
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

    expect(promptCalls).toBe(1);
  } finally {
    loader.restore();
  }
});

test('OnboardingPage._onConfirm: opens goal picker with copy-based duck-name text', () => {
  const bannerSpy = {
    hide() {},
    show() {},
  };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const OnboardingPage = loader.OnboardingPage;
    const opened = [];
    const stored = [];
    const page = new OnboardingPage({
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
    expect(opened[0].title).notToContain('噜噜');
    expect(opened[0].subtitle).notToContain('噜噜');
  } finally {
    loader.restore();
  }
});

test('OnboardingPage.promptInput: uses copy-based modal strings and validation toast', () => {
  const bannerSpy = {
    hide() {},
    show() {},
  };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const OnboardingPage = loader.OnboardingPage;
    const modalCalls = [];
    const toastCalls = [];
    global.wx = {
      showModal(config) {
        modalCalls.push(config);
        config.success({ confirm: true, content: '' });
      },
      showToast(config) {
        toastCalls.push(config);
      },
    };

    const page = new OnboardingPage({
      skipPetPickOnboarding: true,
      storage: {
        set() {},
      },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.copy.namePrompt = '给测试小鸭起名';
    page.copy.inputModalPlaceholderText = '测试占位';
    page.copy.inputModalConfirmText = '测试确认';
    page.copy.inputValidationToast = '测试校验提示';

    page.promptInput();

    expect(modalCalls.length).toBe(1);
    expect(modalCalls[0].title).toBe('给测试小鸭起名');
    expect(modalCalls[0].placeholderText).toBe('测试占位');
    expect(modalCalls[0].confirmText).toBe('测试确认');
    expect(toastCalls.length).toBe(1);
    expect(toastCalls[0].title).toBe('测试校验提示');
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage._promptCustomGoal: uses copy-based modal strings and empty toast', () => {
  const bannerSpy = {
    hide() {},
    show() {},
  };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);
  const originalWx = global.wx;

  try {
    const OnboardingPage = loader.OnboardingPage;
    const modalCalls = [];
    const toastCalls = [];
    global.wx = {
      showModal(config) {
        modalCalls.push(config);
        config.success({ confirm: true, content: '   ' });
      },
      showToast(config) {
        toastCalls.push(config);
      },
    };

    const page = new OnboardingPage({
      skipPetPickOnboarding: true,
      storage: {
        set() {},
      },
      createAndCommitGoal() {
        return null;
      },
      onNameSet() {},
    });
    page.copy.customGoalModalTitle = '测试目标标题';
    page.copy.customGoalPlaceholder = '测试目标占位';
    page.copy.customGoalConfirmText = '测试开始';
    page.copy.customGoalEmptyToast = '测试空值提示';

    page._promptCustomGoal();

    expect(modalCalls.length).toBe(1);
    expect(modalCalls[0].title).toBe('测试目标标题');
    expect(modalCalls[0].placeholderText).toBe('测试目标占位');
    expect(modalCalls[0].confirmText).toBe('测试开始');
    expect(toastCalls.length).toBe(1);
    expect(toastCalls[0].title).toBe('测试空值提示');
  } finally {
    global.wx = originalWx;
    loader.restore();
  }
});

test('OnboardingPage goal feedback: uses the named duck instead of hard-coded lulu wording', () => {
  const bannerSpy = {
    hide() {},
    show() {},
  };
  const loader = loadOnboardingPageWithBannerSpy(bannerSpy);

  try {
    const OnboardingPage = loader.OnboardingPage;
    const said = [];
    const named = [];
    const page = new OnboardingPage({
      skipPetPickOnboarding: true,
      storage: {
        set() {},
      },
      createAndCommitGoal(goal) {
        return goal;
      },
      onNameSet(name) {
        named.push(name);
      },
    });
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

    expect(said[0]).toBe('你的第一个目标！团团记住了！');
    expect(said[0]).notToContain('噜噜');
    expect(named[0]).toBe('团团');
  } finally {
    loader.restore();
  }
});

test('getTaskPageCopy: uses duck name and avoids tool-like reward summary', () => {
  const copy = getTaskPageCopy('团团');
  expect(copy.title).toBe('团团今天的小计划');
  expect(copy.summary).notToContain('今日可获得');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
