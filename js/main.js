// main.js — 噜噜养成主游戏入口（重构版）

import './render';

const DESIGN_W = 375;
const DESIGN_H = 667;

function obtainMainCanvas() {
  try {
    if (typeof canvas !== 'undefined' && canvas) return canvas;
  } catch (e) {}
  if (typeof GameGlobal !== 'undefined' && GameGlobal && GameGlobal.canvas) return GameGlobal.canvas;
  if (typeof wx !== 'undefined' && typeof wx.createCanvas === 'function') {
    try { return wx.createCanvas(); } catch (e) {}
  }
  return null;
}

function scheduleNextFrame(fn) {
  if (typeof wx !== 'undefined' && typeof wx.requestAnimationFrame === 'function') {
    return wx.requestAnimationFrame(fn);
  }
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return setTimeout(fn, 16);
}

const Lulu = require('./Lulu');
const TaskManager = require('./TaskManager');
const GrowthSystem = require('./GrowthSystem');
const Storage = require('./Storage');
const GoalManager = require('./GoalManager');
const WishManager = require('./WishManager');
const PetStateManager = require('./PetStateManager');
const HomePage = require('./ui/HomePage');
const OnboardingPage = require('./ui/OnboardingPage');

const STORAGE_KEYS_LULU = { LULU_NAME: 'lulu_name' };

class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this._canvasSized = false;
    this._bindMainCanvas();

    this.storage = new Storage();
    this.lulu = new Lulu();
    this.taskManager = new TaskManager();
    this.growth = new GrowthSystem();

    // === 新增系统 ===
    this.goalManager = new GoalManager();
    this.goalManager.setStorage(this.storage);
    this.wishManager = new WishManager();
    this.wishManager.setStorage(this.storage);
    this.wishManager.setGoalsRef(this.goalManager.goals);
    this.petStateManager = new PetStateManager();
    this.petStateManager.setStorage(this.storage);

    this.homePage = new HomePage(this);
    this.onboardingPage = new OnboardingPage(this);

    this.currentPage = 'home';
    this._onlineXP = 0;
    this._lastOnlineXPTime = Date.now();

    this.loadData();
    this.homePage.setLulu(this.lulu);

    const BannerAdManager = require('./ads/BannerAdManager');
    BannerAdManager.getInstance().init('YOUR_BANNER_AD_UNIT_ID');

    this.setupTouchHandlers();
    this._activeTouchId = null;
    this.loop();
  }

  _bindMainCanvas() {
    const c = obtainMainCanvas();
    if (!c) return;
    this.canvas = c;
    this.ctx = c.getContext('2d');
    if (!this.ctx) return;
    if (!this._canvasSized && typeof wx !== 'undefined' && wx.getSystemInfoSync) {
      try {
        const sys = wx.getSystemInfoSync();
        const dpr = sys.pixelRatio || 1;
        const cssW = sys.windowWidth || DESIGN_W;
        const cssH = sys.windowHeight || DESIGN_H;
        c.width = Math.floor(cssW * dpr);
        c.height = Math.floor(cssH * dpr);
        this.ctx.scale(dpr, dpr);
        this._cssWidth = cssW;
        this._cssHeight = cssH;
      } catch (e) {
        c.width = DESIGN_W; c.height = DESIGN_H;
        this._cssWidth = DESIGN_W; this._cssHeight = DESIGN_H;
      }
      this._canvasSized = true;
    } else if (!this._canvasSized) {
      c.width = DESIGN_W; c.height = DESIGN_H;
      this._cssWidth = DESIGN_W; this._cssHeight = DESIGN_H;
      this._canvasSized = true;
    }
  }

  setupTouchHandlers() {
    if (typeof wx === 'undefined' || !wx.onTouchStart) return;
    wx.onTouchStart((res) => {
      if (!res.touches || res.touches.length === 0) return;
      const touch = res.touches[0];
      this._activeTouchId = touch.identifier != null ? touch.identifier : 0;
      if (!this.canvas) return;
      this.handleClick(touch.clientX, touch.clientY);
    });
    wx.onTouchMove((res) => {
      if (!this.canvas || !res.touches || res.touches.length === 0) return;
      const touch = res.touches[0];
      if (this._activeTouchId != null && touch.identifier != null && touch.identifier !== this._activeTouchId) return;
      const w = this._cssWidth || this.canvas.width;
      const h = this._cssHeight || this.canvas.height;
      this.homePage.onTouchMove(touch.clientX, touch.clientY, w, h);
    });
    const end = (res) => {
      if (!this.canvas) { this._activeTouchId = null; return; }
      let x = 0, y = 0;
      if (res.changedTouches && res.changedTouches.length > 0) {
        const c = res.changedTouches[0];
        if (this._activeTouchId != null && c.identifier != null && c.identifier !== this._activeTouchId) return;
        x = c.clientX; y = c.clientY;
      } else if (res.touches && res.touches.length > 0) {
        x = res.touches[0].clientX; y = res.touches[0].clientY;
      }
      const w = this._cssWidth || this.canvas.width;
      const h = this._cssHeight || this.canvas.height;
      this.homePage.onTouchEnd(x, y, w, h);
      this._activeTouchId = null;
    };
    wx.onTouchEnd(end);
    wx.onTouchCancel(() => { this.homePage.onTouchCancel(); this._activeTouchId = null; });
  }

  handleClick(x, y) {
    if (!this.canvas) return;
    const w = this._cssWidth || this.canvas.width;
    const h = this._cssHeight || this.canvas.height;
    switch (this.currentPage) {
      case 'home': this.homePage.handleClick(x, y, w, h); break;
      case 'onboarding': if (this.onboardingPage) this.onboardingPage.onTouchStart(x, y, w, h); break;
    }
  }

  getLuluName() {
    const name = this.storage.get(STORAGE_KEYS_LULU.LULU_NAME);
    return (name && name.trim()) ? name.trim() : '小明';
  }

  onNameSet(name) {
    this.currentPage = 'home';
    this.homePage.setLulu(this.lulu);
  }

  _daysBetween(dateA, dateB) {
    if (!dateA || !dateB) return 0;
    const a = new Date(dateA);
    const b = new Date(dateB);
    return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  }

  _getMilestoneDialogue(milestone) {
    const { LULU_DIALOGUES } = require('../utils/constants');
    const templates = LULU_DIALOGUES.milestone[milestone];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  loadData() {
    const name = this.storage.get(STORAGE_KEYS_LULU.LULU_NAME);
    if (!name || !String(name).trim()) {
      this.currentPage = 'onboarding';
      this.onboardingPage.setLulu(this.lulu);
      return;
    }

    // 旧数据兼容：加载 lulu_data
    const luluData = this.storage.get('lulu_data');
    if (luluData) {
      this.lulu.level = luluData.level || 1;
      this.lulu.xp = luluData.xp || 0;
      this.lulu.moodValue = Number.isFinite(luluData.moodValue) ? luluData.moodValue : 68;
      this.lulu.todayInteractionCount = Number.isFinite(luluData.todayInteractionCount) ? luluData.todayInteractionCount : 0;
      this.lulu.unlockedActions = luluData.unlockedActions || [];
    }

    // 旧数据兼容：加载 task_data
    const taskData = this.storage.get('task_data');
    if (taskData) {
      this.taskManager.deserialize(taskData);
    }
    this.taskManager.checkDailyReset();

    // 加载 growth_data
    const growthData = this.storage.get('growth_data');
    if (growthData) {
      this.growth.deserialize(growthData);
    }
    this.lulu.level = this.growth.level;

    // === 加载新系统数据 ===
    this.goalManager.deserialize(this.storage.get('goal_data'));
    this.goalManager.checkDailyReset();
    this.wishManager.deserialize(this.storage.get('wish_data'));
    this.wishManager.checkDailyReset();
    this.petStateManager.deserialize(this.storage.get('pet_state_data'));

    // 注入 PetStateManager 到 Lulu
    this.lulu.setPetStateManager(this.petStateManager);

    // === 日终结算 ===
    const today = this.goalManager.getTodayString();
    const lastActive = this.goalManager.lastResetDate || today;
    const disconnectDays = this._daysBetween(lastActive, today);

    if (disconnectDays > 0) {
      for (let d = 1; d <= disconnectDays; d++) {
        const isLastDay = (d === disconnectDays);
        if (isLastDay) {
          const commitments = this.goalManager.getTodayCommitments();
          const completedCount = commitments.filter(c => c.completed).length;
          this.petStateManager.settleDaily(1, {
            completedCount,
            totalCommitments: commitments.length,
            consecutiveDays: this.petStateManager.consecutiveDays,
          });
        } else {
          this.petStateManager.settleDaily(1, {
            completedCount: 0,
            totalCommitments: 0,
            consecutiveDays: 0,
          });
        }
      }

      // 断联问候语
      if (disconnectDays >= 1) {
        const greeting = this.petStateManager.getAbsenceGreeting(disconnectDays);
        if (greeting) this.lulu.say(greeting, 120);
      }

      // 里程碑检测
      const milestone = this.petStateManager.checkMilestone();
      if (milestone) {
        this.lulu.say(this._getMilestoneDialogue(milestone), 150);
      }
    }

    // 同步宠物心情
    this.lulu.moodValue = this.petStateManager.moodValue;

    // 生成今日心愿（如有目标）
    if (this.goalManager.getGoals().length > 0 && this.wishManager.getTodayWishes().length === 0) {
      this.wishManager.generateDailyWishes(this.goalManager.getGoals());
    }
  }

  saveData() {
    this.storage.set('lulu_data', {
      level: this.lulu.level,
      xp: this.lulu.xp,
      moodValue: this.petStateManager.moodValue,
      todayInteractionCount: this.lulu.todayInteractionCount || 0,
      unlockedActions: this.lulu.unlockedActions || [],
    });
    this.storage.set('task_data', this.taskManager.serialize());
    this.storage.set('growth_data', this.growth.serialize());
    this.storage.set('goal_data', this.goalManager.serialize());
    this.storage.set('wish_data', this.wishManager.serialize());
    this.storage.set('pet_state_data', this.petStateManager.serialize());
  }

  /** 完成目标（今日承诺） */
  completeGoal(goalId) {
    const commitments = this.goalManager.getTodayCommitments();
    const commit = commitments.find(c => c.goalId === goalId);
    if (!commit || commit.completed) return;

    this.goalManager.completeCommitment(goalId);

    // 查找对应心愿并完成
    const wish = this.wishManager.getTodayWishes().find(w => w.goalId === goalId);
    let wishReward = null;
    if (wish) {
      wishReward = this.wishManager.completeWish(wish.id);
    }

    // XP结算（单次上限30）
    const goal = this.goalManager.getGoalById(goalId);
    const baseXp = goal ? goal.xp : 15;
    const moodMult = this.petStateManager.getMoodXPMultiplier();
    const xp = Math.min(30, Math.round((baseXp + (wishReward ? 5 : 0)) * moodMult));

    const levelBefore = this.growth.level;
    this.growth.addXp(xp);
    if (this.growth.level > this.lulu.level) {
      this.lulu.level = this.growth.level;
    }
    if (this.growth.level > levelBefore) {
      this.lulu.say('升级了噜噜！', 100);
    }

    // 心情更新
    const moodBoost = wishReward ? wishReward.moodBoost : (8 + Math.floor(Math.random() * 7));
    this.petStateManager.adjustMood(moodBoost);
    this.lulu.moodValue = this.petStateManager.moodValue;

    // 爱星奖励（心愿任务）
    if (wishReward && wishReward.loveStar) {
      this.growth.addWishLoveStar();
    }

    // 宠物见证反馈
    this.lulu.onGoalCompleted(goal ? goal.name : '目标');

    // 30%概率触发酷炫动作
    if (Math.random() < 0.3) {
      const actions = this.lulu.unlockedActions || [];
      if (actions.length > 0) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        this.lulu.playCoolAction(action.id);
      }
    }

    this.saveData();
  }

  onLuluInteraction() {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
    }
  }

  loop() {
    if (!this.canvas || !this.ctx) this._bindMainCanvas();
    if (!this.canvas || !this.ctx) { scheduleNextFrame(() => this.loop()); return; }
    this.update();
    this.render();
    scheduleNextFrame(() => this.loop());
  }

  update() {
    this.lulu.update();

    // 在线计时：每分钟+1 XP
    const now = Date.now();
    if (this._lastOnlineXPTime && now - this._lastOnlineXPTime >= 60000) {
      const before = this.growth.level;
      this.growth.addXp(1);
      this._onlineXP += 1;
      this._lastOnlineXPTime = now;
      if (this.growth.level > before) {
        this.lulu.level = this.growth.level;
        this.lulu.say('升级了噜噜！', 100);
      }
      if (this._onlineXP > 0 && this._onlineXP % 5 === 0) {
        if (typeof wx !== 'undefined' && wx.showToast) {
          wx.showToast({ title: `噜噜陪你涨了 +${this._onlineXP} XP`, icon: 'none', duration: 1500 });
        }
      }
    }
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const w = this._cssWidth || this.canvas.width;
    const h = this._cssHeight || this.canvas.height;
    switch (this.currentPage) {
      case 'home': this.homePage.render(this.ctx, w, h); break;
      case 'onboarding': if (this.onboardingPage) this.onboardingPage.render(this.ctx, w, h); break;
    }
  }
}

export default Game;
