// 品牌命名与联调测试
// 运行: node tests/BrandingIntegration.test.js

const fs = require('fs');
const path = require('path');
const GoalPickerOverlay = require('../js/ui/GoalPickerOverlay');

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
    notToContain(unexpected) {
      if (String(value).includes(unexpected)) {
        throw new Error(`Expected value not to contain ${unexpected}, got ${value}`);
      }
    },
    toContain(expected) {
      if (!String(value).includes(expected)) {
        throw new Error(`Expected value to contain ${expected}, got ${value}`);
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
    save() {},
    restore() {},
    fillRect() {},
    fill() {},
    stroke() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    closePath() {},
    fillText(text) {
      drawnTexts.push(String(text));
    },
    createLinearGradient() {
      return createFakeGradient();
    },
  };
}

console.log('\n=== BrandingIntegration Tests ===\n');

test('main.js: uses 小鸭 as fallback name and removes old Lulu upgrade copy', () => {
  const mainSource = fs.readFileSync(path.resolve(__dirname, '../js/main.js'), 'utf8');
  expect(mainSource).toContain("return (name && name.trim()) ? name.trim() : '小鸭';");
  expect(mainSource).notToContain('小明');
  expect(mainSource).notToContain('升级了噜噜');
  expect(mainSource).notToContain('噜噜陪你涨了');
});

test('GoalPickerOverlay.open: default title uses current duck name', () => {
  const overlay = new GoalPickerOverlay({
    getLuluName() {
      return '团团';
    },
    goalManager: {
      getRecommendations() {
        return [];
      },
    },
  });

  overlay.open();

  expect(overlay.title).toBe('今天想和团团一起坚持什么？');
});

test('GoalPickerOverlay.render: mandatory footer uses current duck name', () => {
  const overlay = new GoalPickerOverlay({
    getLuluName() {
      return '团团';
    },
    goalManager: {
      getRecommendations() {
        return [];
      },
    },
  });
  const ctx = createFakeCtx();

  overlay.open({ mandatory: true });
  overlay.render(ctx, 375, 812);

  expect(ctx.drawnTexts.includes('先选一个目标，再带团团回到首页')).toBe(true);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
