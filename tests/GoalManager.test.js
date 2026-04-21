// GoalManager 单元测试（Node环境直接运行）
// 运行: node tests/GoalManager.test.js

const GoalManager = require('../js/GoalManager');

// 模拟 Storage
function createGM() {
  const gm = new GoalManager();
  gm._storage = { get: () => null, set: () => {} };
  return gm;
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
    toBeDefined: () => { if (typeof v === 'undefined') throw new Error('Expected value to be defined'); },
    toBeGreaterThanOrEqual: (n) => { if (v < n) throw new Error(`Expected >= ${n}, got ${v}`); },
    toBeLessThanOrEqual: (n) => { if (v > n) throw new Error(`Expected <= ${n}, got ${v}`); },
    toBeGreaterThan: (n) => { if (v <= n) throw new Error(`Expected > ${n}, got ${v}`); },
    toEqual: (n) => { if (JSON.stringify(v) !== JSON.stringify(n)) throw new Error(`Expected ${JSON.stringify(n)}, got ${JSON.stringify(v)}`); },
  };
}

console.log('\n=== GoalManager Tests ===\n');

test('createGoal: adds goal to goals array', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '每天跑步30分钟', type: 'habit', baseXp: 20 });
  expect(goal.id).toBeTruthy();
  expect(goal.name).toBe('每天跑步30分钟');
  expect(goal.type).toBe('habit');
  expect(gm.getGoals().length).toBe(1);
});

test('createGoal: milestone goal needs totalProgress', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '跑完50公里', type: 'milestone', xp: 25, totalProgress: 50 });
  expect(goal.totalProgress).toBe(50);
  expect(goal.currentProgress).toBe(0);
});

test('createGoal: rejects milestone without totalProgress', () => {
  const gm = createGM();
  let ok = false;
  try {
    gm.createGoal({ name: 'test', type: 'milestone' });
  } catch (e) {
    ok = true;
  }
  expect(ok).toBe(true);
});

test('getGoals: returns all non-completed goals', () => {
  const gm = createGM();
  gm.createGoal({ name: 'goal1', type: 'habit', xp: 10 });
  const goal2 = gm.createGoal({ name: 'goal2', type: 'oneTime', xp: 10 });
  goal2.completed = true;
  expect(gm.getGoals().length).toBe(1);
});

test('updateProgress: increments progress for milestone', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '跑完50公里', type: 'milestone', xp: 20, totalProgress: 50 });
  gm.updateProgress(goal.id, 10);
  const updated = gm.getGoalById(goal.id);
  expect(updated.currentProgress).toBe(10);
});

test('updateProgress: caps progress at totalProgress and marks completed', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '跑完50公里', type: 'milestone', xp: 20, totalProgress: 50 });
  gm.updateProgress(goal.id, 100);
  const updated = gm.getGoalById(goal.id);
  expect(updated.currentProgress).toBe(50);
  expect(updated.completed).toBe(true);
});

test('deleteGoal: removes goal by id', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: 'test', type: 'habit', xp: 10 });
  gm.deleteGoal(goal.id);
  expect(gm.getGoals().length).toBe(0);
});

test('commitGoal: adds goal to todayCommitments', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: 'test', type: 'habit', xp: 10 });
  gm.commitGoal(goal.id);
  expect(gm.getTodayCommitments().length).toBe(1);
  expect(gm.getTodayCommitments()[0].goalId).toBe(goal.id);
});

test('commitGoal: rejects more than 4 commitments', () => {
  const gm = createGM();
  for (let i = 0; i < 4; i++) {
    gm.commitGoal(gm.createGoal({ name: `g${i}`, type: 'habit', xp: 10 }).id);
  }
  const extra = gm.createGoal({ name: 'extra', type: 'habit', xp: 10 });
  let ok = false;
  try {
    gm.commitGoal(extra.id);
  } catch (e) {
    ok = true;
  }
  expect(ok).toBe(true);
});

test('commitGoal: rejects already-committed goal', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: 'test', type: 'habit', xp: 10 });
  gm.commitGoal(goal.id);
  let ok = false;
  try {
    gm.commitGoal(goal.id);
  } catch (e) {
    ok = true;
  }
  expect(ok).toBe(true);
});

test('completeCommitment: marks commitment done and updates goal lastDoneAt', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: 'test', type: 'habit', xp: 10 });
  gm.commitGoal(goal.id);
  gm.completeCommitment(goal.id);
  const commit = gm.getTodayCommitments().find(c => c.goalId === goal.id);
  expect(commit.completed).toBe(true);
  expect(goal.lastDoneAt).toBeTruthy();
});

test('completeCommitment: for milestone increments progress by 1', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '跑50公里', type: 'milestone', xp: 20, totalProgress: 50 });
  gm.commitGoal(goal.id);
  gm.completeCommitment(goal.id);
  expect(gm.getGoalById(goal.id).currentProgress).toBe(1);
});

test('getRecommendations: returns 3-5 random goals when goals array empty', () => {
  const gm = createGM();
  const recs = gm.getRecommendations();
  expect(recs.length).toBeGreaterThanOrEqual(3);
  expect(recs.length).toBeLessThanOrEqual(5);
  recs.forEach(r => {
    expect(r.name).toBeTruthy();
    expect(r.type).toBeTruthy();
    expect(r.xp).toBeGreaterThanOrEqual(5);
  });
});

test('getRecommendations: all unique (no duplicate names)', () => {
  const gm = createGM();
  const recs = gm.getRecommendations();
  const names = recs.map(r => r.name);
  const unique = new Set(names);
  expect(unique.size).toBe(names.length);
});

test('createGoal: initializes new goal fields for dynamic xp system', () => {
  const gm = createGM();
  const goal = gm.createGoal({
    name: '每天阅读30分钟',
    type: 'habit',
    icon: '📚',
    tag: '学习',
    baseXp: 18,
    createdFrom: 'recommended',
  });
  expect(goal.baseXp).toBe(18);
  expect(goal.createdFrom).toBe('recommended');
  expect(goal.icon).toBe('📚');
  expect(goal.tag).toBe('学习');
  expect(goal.streakDays).toBe(0);
  expect(goal.bestStreakDays).toBe(0);
  expect(goal.lastCompletedDate).toBe(null);
});

test('createGoal: reuses existing unfinished goal with same name', () => {
  const gm = createGM();
  const first = gm.createGoal({ name: '早睡打卡', type: 'habit', baseXp: 15, createdFrom: 'custom' });
  const second = gm.createGoal({ name: '早睡打卡', type: 'habit', baseXp: 18, createdFrom: 'custom' });
  expect(second.id).toBe(first.id);
  expect(gm.getGoals().length).toBe(1);
});

test('getGoalPreviewXp: applies streak and mood multipliers for habit goal', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '跑步', type: 'habit', baseXp: 20 });
  goal.streakDays = 6;
  const previewXp = gm.getGoalPreviewXp(goal.id, 88);
  expect(previewXp).toBe(26);
});

test('applyGoalCompletion: increments streak for committed and completed habit', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '阅读', type: 'habit', baseXp: 20 });
  gm.applyGoalCompletion(goal.id, {
    committedToday: true,
    completed: true,
    date: '2026-04-21',
  });
  const updated = gm.getGoalById(goal.id);
  expect(updated.streakDays).toBe(1);
  expect(updated.bestStreakDays).toBe(1);
  expect(updated.lastCompletedDate).toBe('2026-04-21');
});

test('applyGoalCompletion: resets streak when committed but not completed', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '冥想', type: 'habit', baseXp: 12 });
  goal.streakDays = 5;
  goal.bestStreakDays = 5;
  gm.applyGoalCompletion(goal.id, {
    committedToday: true,
    completed: false,
    date: '2026-04-21',
  });
  const updated = gm.getGoalById(goal.id);
  expect(updated.streakDays).toBe(0);
  expect(updated.bestStreakDays).toBe(5);
});

test('applyGoalCompletion: freezes streak when goal not committed today', () => {
  const gm = createGM();
  const goal = gm.createGoal({ name: '拉伸', type: 'habit', baseXp: 10 });
  goal.streakDays = 3;
  goal.bestStreakDays = 4;
  gm.applyGoalCompletion(goal.id, {
    committedToday: false,
    completed: false,
    date: '2026-04-21',
  });
  const updated = gm.getGoalById(goal.id);
  expect(updated.streakDays).toBe(3);
  expect(updated.bestStreakDays).toBe(4);
});

test('serialize/deserialize: roundtrip preserves all data', () => {
  const gm = createGM();
  gm.createGoal({ name: 'goal1', type: 'habit', xp: 20 });
  gm.commitGoal(gm.getGoals()[0].id);
  const data = gm.serialize();
  const gm2 = createGM();
  gm2.deserialize(data);
  expect(gm2.getGoals().length).toBe(1);
  expect(gm2.getTodayCommitments().length).toBe(1);
});

test('checkDailyReset: resets commitments but keeps goals', () => {
  const gm = createGM();
  gm.createGoal({ name: 'goal1', type: 'habit', xp: 20 });
  gm.commitGoal(gm.getGoals()[0].id);
  gm.checkDailyReset();
  expect(gm.getGoals().length).toBe(1);
  expect(gm.getTodayCommitments().length).toBe(0);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
