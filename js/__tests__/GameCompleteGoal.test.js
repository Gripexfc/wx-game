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
  expect(updated.completed).toBeFalsy();
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
