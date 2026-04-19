// 缓动函数库
const Easing = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

// Tween 实例管理器
class TweenManager {
  constructor() {
    this.tweens = [];
  }

  add(obj, targetProps, duration, easing = 'easeOut') {
    const startProps = {};
    for (const key in targetProps) {
      startProps[key] = obj[key];
    }
    const tween = {
      obj, startProps, targetProps,
      duration, startTime: Date.now(),
      easing: Easing[easing] || Easing.linear,
      done: false,
    };
    this.tweens.push(tween);
    return tween;
  }

  update() {
    const now = Date.now();
    this.tweens = this.tweens.filter(t => {
      if (t.done) return false;
      const elapsed = now - t.startTime;
      const progress = Math.min(elapsed / t.duration, 1);
      const easedProgress = t.easing(progress);
      for (const key in t.targetProps) {
        t.obj[key] = t.startProps[key] + (t.targetProps[key] - t.startProps[key]) * easedProgress;
      }
      if (progress >= 1) {
        t.done = true;
      }
      return !t.done;
    });
  }
}

module.exports = { TweenManager, Easing };
