function inferTaskTheme(goal) {
  if (!goal) return null;
  const id = String(goal.id || '').toLowerCase();
  const tag = String(goal.tag || '').toLowerCase();
  const name = String(goal.name || '').toLowerCase();
  const text = `${id} ${tag} ${name}`;
  if (/fitness|sport|run|gym|运动|健身|跑步|力量/.test(text)) return 'fitness_power';
  if (/read|book|study|阅读|读书|学习/.test(text)) return 'read_focus';
  if (/eat|diet|food|meal|饮食|吃饭|营养/.test(text)) return 'eat_vitality';
  return null;
}

function getMoodBand(moodValue) {
  const mood = Number(moodValue) || 0;
  if (mood >= 80) return 'sunny';
  if (mood >= 60) return 'happy';
  if (mood >= 40) return 'calm';
  return 'low';
}

class ThemeEngine {
  constructor() {
    this.activeTheme = 'home_cozy';
    this.previousTheme = 'home_cozy';
    this.source = 'ambient';
    this.lastTaskTheme = null;
    this.taskThemeExpiresAt = 0;
    this.transitionProgress = 1;
    this.transitionStartAt = 0;
    this.transitionDurationMs = 420;
  }

  _pickAmbientTheme(moodBand, nowMs) {
    const spin = Math.floor(nowMs / 15000) % 3;
    if (moodBand === 'sunny') return ['park_breeze', 'home_cozy', 'work_focus'][spin];
    if (moodBand === 'happy') return ['home_cozy', 'park_breeze', 'work_focus'][spin];
    if (moodBand === 'calm') return ['home_cozy', 'work_focus', 'park_breeze'][spin];
    return ['work_focus', 'home_cozy', 'park_breeze'][spin];
  }

  _setTheme(nextTheme, source, nowMs) {
    if (!nextTheme || nextTheme === this.activeTheme) return;
    this.previousTheme = this.activeTheme;
    this.activeTheme = nextTheme;
    this.source = source;
    this.transitionProgress = 0;
    this.transitionStartAt = nowMs;
  }

  onGoalCompleted(goal, nowMs) {
    const taskTheme = inferTaskTheme(goal);
    if (!taskTheme) return;
    this.lastTaskTheme = taskTheme;
    this.taskThemeExpiresAt = nowMs + 45 * 60 * 1000;
    this._setTheme(taskTheme, 'task', nowMs);
  }

  update(moodValue, nowMs) {
    if (this.transitionProgress < 1) {
      const t = (nowMs - this.transitionStartAt) / this.transitionDurationMs;
      this.transitionProgress = Math.max(0, Math.min(1, t));
    }

    const taskThemeActive = this.lastTaskTheme && nowMs < this.taskThemeExpiresAt;
    if (taskThemeActive) {
      if (this.activeTheme !== this.lastTaskTheme) {
        this._setTheme(this.lastTaskTheme, 'task', nowMs);
      }
      return;
    }

    const ambientTheme = this._pickAmbientTheme(getMoodBand(moodValue), nowMs);
    this._setTheme(ambientTheme, 'ambient', nowMs);
  }

  getState() {
    return {
      activeTheme: this.activeTheme,
      previousTheme: this.previousTheme,
      transitionProgress: this.transitionProgress,
      source: this.source,
    };
  }
}

module.exports = {
  ThemeEngine,
  inferTaskTheme,
  getMoodBand,
};

