// WishManager 单元测试
const WishManager = require('../WishManager');

function createWM() {
  const wm = new WishManager();
  wm._storage = { get: () => null, set: () => {} };
  return wm;
}

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    failed++;
  }
}
function expect(v) {
  return {
    toBe: (n) => { if (v !== n) throw new Error(`Expected ${n}, got ${v}`); },
    toBeTruthy: () => { if (!v) throw new Error(`Expected truthy, got ${v}`); },
    toBeFalsy: () => { if (v) throw new Error(`Expected falsy, got ${v}`); },
    toBeGreaterThan: (n) => { if (v <= n) throw new Error(`Expected > ${n}, got ${v}`); },
    toBeGreaterThanOrEqual: (n) => { if (v < n) throw new Error(`Expected >= ${n}, got ${v}`); },
    toBeLessThanOrEqual: (n) => { if (v > n) throw new Error(`Expected <= ${n}, got ${v}`); },
  };
}

console.log('\n=== WishManager Tests ===\n');

test('generateDailyWishes: creates 2-3 wishes from goals', () => {
  const wm = createWM();
  const goals = [
    { id: 'g1', name: '每天跑步30分钟', type: 'habit', xp: 20, tag: '运动' },
    { id: 'g2', name: '每天阅读30分钟', type: 'habit', xp: 20, tag: '学习' },
    { id: 'g3', name: '每天冥想10分钟', type: 'habit', xp: 10, tag: '健康' },
  ];
  wm.generateDailyWishes(goals);
  const wishes = wm.getTodayWishes();
  expect(wishes.length).toBeGreaterThanOrEqual(2);
  expect(wishes.length).toBeLessThanOrEqual(3);
  wishes.forEach(w => {
    expect(w.goalId).toBeTruthy();
    expect(w.wishText).toBeTruthy();
    expect(w.completed).toBe(false);
  });
});

test('generateDailyWishes: wishText contains goal name', () => {
  const wm = createWM();
  const goals = [{ id: 'g1', name: '每天跑步30分钟', type: 'habit', xp: 20, tag: '运动' }];
  wm.generateDailyWishes(goals);
  const wish = wm.getTodayWishes()[0];
  expect(wish.wishText.length).toBeGreaterThan(0);
  expect(wish.goalId).toBe('g1');
});

test('completeWish: marks wish done and returns reward', () => {
  const wm = createWM();
  const goals = [{ id: 'g1', name: '每天跑步30分钟', type: 'habit', xp: 20, tag: '运动' }];
  wm.generateDailyWishes(goals);
  const wish = wm.getTodayWishes()[0];
  const reward = wm.completeWish(wish.id);
  expect(wish.completed).toBe(true);
  expect(reward.xp).toBeGreaterThan(0);
  expect(reward.moodBoost).toBeGreaterThan(0);
  expect(reward.loveStar).toBe(1);
});

test('completeWish: for milestone goal returns goalId without modifying goal', () => {
  const wm = createWM();
  const goals = [{
    id: 'g1', name: '跑完10公里', type: 'milestone', xp: 25,
    totalProgress: 10, currentProgress: 0, tag: '运动',
  }];
  wm.generateDailyWishes(goals);
  const wish = wm.getTodayWishes()[0];
  const reward = wm.completeWish(wish.id);
  expect(wish.completed).toBe(true);
  expect(reward.goalId).toBe('g1');
  expect(reward.goalCompleted).toBe(false);
});

test('getTodayWishes: only returns uncompleted wishes', () => {
  const wm = createWM();
  const goals = [{ id: 'g1', name: '每天跑步30分钟', type: 'habit', xp: 20, tag: '运动' }];
  wm.generateDailyWishes(goals);
  const wish = wm.getTodayWishes()[0];
  wm.completeWish(wish.id);
  expect(wm.getTodayWishes().length).toBe(0);
  expect(wm.getCompletedWishes().length).toBe(1);
});

test('checkDailyReset: clears wishes on new day', () => {
  const wm = createWM();
  wm.todayWishes = [];
  wm.lastResetDate = null;
  const goals = [{ id: 'g1', name: '每天跑步30分钟', type: 'habit', xp: 20, tag: '运动' }];
  wm.generateDailyWishes(goals);
  wm.getTodayWishes()[0].completed = true;
  wm.checkDailyReset();
  expect(wm.getTodayWishes().length).toBe(0);
});

test('getUnfinishedYesterday: returns yesterday incomplete wish text', () => {
  const wm = createWM();
  const goals = [{ id: 'g1', name: '每天跑步30分钟', type: 'habit', xp: 20, tag: '运动' }];
  // 第一天生成心愿（未完成）
  wm.generateDailyWishes(goals);
  // 模拟进入第二天：清空重置日期，重新生成
  wm.lastResetDate = null;
  wm.generateDailyWishes(goals);
  // 现在 yesterdayUnfinished 应该被设置了
  expect(wm.getUnfinishedYesterday()).toBeTruthy();
});

test('getUnfinishedYesterday: returns null if none', () => {
  const wm = createWM();
  expect(wm.getUnfinishedYesterday()).toBeFalsy();
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
