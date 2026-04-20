// PetStateManager 单元测试
const PetStateManager = require('../PetStateManager');

function createPSM(mood = 68) {
  const psm = new PetStateManager();
  psm._storage = { get: () => null, set: () => {} };
  psm.moodValue = mood;
  psm.consecutiveDays = 0;
  psm.totalDays = 0;
  psm.completedDays = 0;
  psm.lastSettleDate = null;
  psm.petEveningMood = mood;
  psm.milestones = { day3: false, day7: false, day14: false, day30: false };
  return psm;
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
    toBeNull: () => { if (v !== null) throw new Error(`Expected null, got ${v}`); },
    toBeGreaterThanOrEqual: (n) => { if (v < n) throw new Error(`Expected >= ${n}, got ${v}`); },
    toBeLessThanOrEqual: (n) => { if (v > n) throw new Error(`Expected <= ${n}, got ${v}`); },
    toBeGreaterThan: (n) => { if (v <= n) throw new Error(`Expected > ${n}, got ${v}`); },
  };
}

console.log('\n=== PetStateManager Tests ===\n');

test('getMoodLevel: returns correct level names', () => {
  const psm = createPSM(20);
  expect(psm.getMoodLevel()).toBe('沮丧');
  psm.moodValue = 50;
  expect(psm.getMoodLevel()).toBe('安静');
  psm.moodValue = 70;
  expect(psm.getMoodLevel()).toBe('开心');
  psm.moodValue = 88;
  expect(psm.getMoodLevel()).toBe('幸福');
  psm.moodValue = 97;
  expect(psm.getMoodLevel()).toBe('超级幸福');
});

test('getMoodSpeedFactor: returns correct speed multipliers', () => {
  const psm = createPSM(90);
  expect(psm.getMoodSpeedFactor()).toBe(1.3);
  psm.moodValue = 65;
  expect(psm.getMoodSpeedFactor()).toBe(1.0);
  psm.moodValue = 50;
  expect(psm.getMoodSpeedFactor()).toBe(0.7);
  psm.moodValue = 30;
  expect(psm.getMoodSpeedFactor()).toBe(0.5);
});

test('getMoodColorMultiplier: returns correct saturation', () => {
  const psm = createPSM(90);
  expect(psm.getMoodColorMultiplier()).toBe(1.1);
  psm.moodValue = 65;
  expect(psm.getMoodColorMultiplier()).toBe(1.0);
  psm.moodValue = 50;
  expect(psm.getMoodColorMultiplier()).toBe(0.85);
  psm.moodValue = 30;
  expect(psm.getMoodColorMultiplier()).toBe(0.7);
});

test('getMoodXPMultiplier: returns correct XP multipliers', () => {
  const psm = createPSM(90);
  expect(psm.getMoodXPMultiplier()).toBe(1.2);
  psm.moodValue = 70;
  expect(psm.getMoodXPMultiplier()).toBe(1.0);
  psm.moodValue = 50;
  expect(psm.getMoodXPMultiplier()).toBe(0.9);
  psm.moodValue = 30;
  expect(psm.getMoodXPMultiplier()).toBe(0.8);
});

test('calculateMoodDecay: correct decay for each disconnect days', () => {
  const psm = createPSM(68);
  expect(psm.calculateMoodDecay(0)).toBe(0);
  expect(psm.calculateMoodDecay(1)).toBe(-3);
  expect(psm.calculateMoodDecay(2)).toBe(-8);
  expect(psm.calculateMoodDecay(3)).toBe(-15);
  expect(psm.calculateMoodDecay(5)).toBe(-25);
  expect(psm.calculateMoodDecay(7)).toBe(-35);
  expect(psm.calculateMoodDecay(10)).toBe(-50);
});

test('settleDaily: mood reduced by correct decay amount', () => {
  const psm = createPSM(68);
  psm.settleDaily(2, { completedCount: 0, totalCommitments: 2, consecutiveDays: 0 });
  expect(psm.moodValue).toBe(60); // 68 - 8
});

test('settleDaily: with no tasks completed reduces mood by -8', () => {
  const psm = createPSM(68);
  psm.settleDaily(0, { completedCount: 0, totalCommitments: 3, consecutiveDays: 0 });
  expect(psm.moodValue).toBe(60); // 68 - 8
});

test('settleDaily: with tasks completed adds mood based on score', () => {
  const psm = createPSM(50);
  psm.settleDaily(0, { completedCount: 2, totalCommitments: 4, consecutiveDays: 0 });
  // score = 2*15 + 0 = 30, moodDelta = min(9, 30) = 9
  expect(psm.moodValue).toBe(59);
});

test('settleDaily: score capped at 100', () => {
  const psm = createPSM(50);
  psm.settleDaily(0, { completedCount: 4, totalCommitments: 4, consecutiveDays: 30 });
  // score = 4*15 + 12 = 72 (< 100, not capped)
  // moodDelta = min(72*0.3, 30) = 21.6 → 22
  // moodValue = 50 + 22 = 72
  expect(psm.moodValue).toBe(72);
});

test('settleDaily: increments consecutiveDays if tasks completed', () => {
  const psm = createPSM(68);
  psm.consecutiveDays = 3;
  psm.settleDaily(0, { completedCount: 1, totalCommitments: 2, consecutiveDays: 3 });
  expect(psm.consecutiveDays).toBe(4);
});

test('settleDaily: resets consecutiveDays if no tasks completed', () => {
  const psm = createPSM(68);
  psm.consecutiveDays = 10;
  psm.settleDaily(0, { completedCount: 0, totalCommitments: 2, consecutiveDays: 10 });
  expect(psm.consecutiveDays).toBe(0);
});

test('settleDaily: updates totalDays and completedDays', () => {
  const psm = createPSM(68);
  psm.settleDaily(0, { completedCount: 2, totalCommitments: 3, consecutiveDays: 0 });
  expect(psm.totalDays).toBe(1);
  expect(psm.completedDays).toBe(1);
});

test('settleDaily: updates petEveningMood', () => {
  const psm = createPSM(68);
  psm.settleDaily(0, { completedCount: 1, totalCommitments: 2, consecutiveDays: 0 });
  // moodDelta = min(15*0.3, 30) = 4.5 → 5, mood = 68+5 = 73
  expect(psm.petEveningMood).toBe(73);
});

test('checkMilestone: returns day3 when first time', () => {
  const psm = createPSM(68);
  psm.consecutiveDays = 3;
  expect(psm.checkMilestone()).toBe('day3');
});

test('checkMilestone: returns null if already triggered', () => {
  const psm = createPSM(68);
  psm.milestones.day3 = true;
  psm.consecutiveDays = 5;
  expect(psm.checkMilestone()).toBeNull();
});

test('checkMilestone: day7 triggers when day3 already done', () => {
  const psm = createPSM(68);
  psm.milestones.day3 = true; // day3已触发
  psm.consecutiveDays = 7;
  expect(psm.checkMilestone()).toBe('day7');
});

test('getCompletionRate: calculates percentage correctly', () => {
  const psm = createPSM(68);
  psm.totalDays = 10;
  psm.completedDays = 8;
  expect(psm.getCompletionRate()).toBe(80);
});

test('getCompletionRate: returns 0 if no days', () => {
  const psm = createPSM(68);
  expect(psm.getCompletionRate()).toBe(0);
});

test('adjustMood: clamps mood between 0 and 100', () => {
  const psm = createPSM(95);
  psm.adjustMood(20);
  expect(psm.moodValue).toBe(100);
  psm.moodValue = 5;
  psm.adjustMood(-20);
  expect(psm.moodValue).toBe(0);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
