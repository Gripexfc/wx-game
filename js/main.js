// main.js — 噜噜养成主游戏入口（重构版）

if (typeof wx !== 'undefined' && wx.cloud) {
  try {
    wx.cloud.init({ traceUser: true });
  } catch (e) {
    console.warn('[main] cloud.init', e);
  }
}

const { STORAGE_KEYS: GLOBAL_STORAGE } = require('../utils/constants');
const { upsertUserProfile } = require('./services/cloud/user');

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
  return setTimeout(fn, FRAME_FALLBACK_MS);
}

const Lulu = require('./Lulu');

// 游戏常量
const ONLINE_XP_INTERVAL = 60000;    // 在线XP：每分钟+1
const COOL_ACTION_PROB = 0.3;       // 酷炫动作触发概率30%
const FRAME_FALLBACK_MS = 16;        // requestAnimationFrame兜底帧时长
const GOAL_UNDO_WINDOW_MS = 10000;   // 任务完成后撤销窗口
const MAJOR_EVOLUTION_LEVELS = [6, 11, 16];
/** 可选「暴击」经验：每日触发上限（自然日，与 goal 同日历） */
const GOAL_CRIT_DAILY_CAP = 3;
const GOAL_CRIT_CHANCE = 0.12;

function normalizeGamePrefs(raw) {
  const p = raw && typeof raw === 'object' ? { ...raw } : {};
  const tier = p.motionTier;
  p.motionTier = tier === 'low' || tier === 'high' ? tier : 'standard';
  /** 默认关闭：用户点 Lv 徽章可开启「完成暴击」（每日最多 3 次） */
  if (p.goalCritEnabled === undefined) p.goalCritEnabled = false;
  if (typeof p.critCount !== 'number' || p.critCount < 0) p.critCount = 0;
  if (typeof p.critDay !== 'string') p.critDay = '';
  return p;
}

const TaskManager = require('./TaskManager');
const GrowthSystem = require('./GrowthSystem');
const Storage = require('./Storage');
const GoalManager = require('./GoalManager');
const WishManager = require('./WishManager');
const PetStateManager = require('./PetStateManager');
const { daysBetween } = require('./utils/date');
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
    this.petStateManager = new PetStateManager();
    this.petStateManager.setStorage(this.storage);
    this.homePage = new HomePage(this);
    this.onboardingPage = new OnboardingPage(this);

    this.currentPage = 'home';
    this._onlineXP = 0;
    this._lastOnlineXPTime = Date.now();
    this._goalUndoState = Object.create(null);
    this.gamePrefs = normalizeGamePrefs(null);

    this.loadData();
    this.homePage.setLulu(this.lulu);
    this.homePage.setGameSystems({
      goalManager: this.goalManager,
      wishManager: this.wishManager,
      petStateManager: this.petStateManager,
      growth: this.growth,
      onCompleteGoal: (goalId) => this.completeGoal(goalId),
      onUndoGoal: (goalId) => this.undoGoal(goalId),
      canUndoGoal: (goalId) => this.canUndoGoal(goalId),
      onCommitGoal: (goalId) => { /* 承诺目标 */ },
      onCreateGoal: (goal) => { /* 创建目标 */ },
    });

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
    return (name && name.trim()) ? name.trim() : '小鸭';
  }

  onNameSet(name) {
    this.currentPage = 'home';
    this.homePage.setLulu(this.lulu);
  }

  /** 首启完成时尝试同步用户资料到云（失败忽略，本地已保存） */
  onOnboardingCloudSync({ petVariantId, petName }) {
    const safeName = (petName && String(petName).trim()) || this.getLuluName();
    upsertUserProfile({
      petVariantId: petVariantId != null ? petVariantId : 0,
      petName: safeName,
      nickName: safeName,
    }).catch(() => {});
  }

  createAndCommitGoal(goalData) {
    try {
      const goal = this.goalManager.createGoal(goalData);
      this.goalManager.commitGoal(goal.id);
      if (this.wishManager.getTodayWishes().length === 0) {
        this.wishManager.generateDailyWishes(this.goalManager.getGoals());
      }
      this.saveData();
      return goal;
    } catch (error) {
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({
          title: error && error.message ? error.message : '添加目标失败',
          icon: 'none',
          duration: 1500,
        });
      }
      return null;
    }
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
    const petVar = this.storage.get(GLOBAL_STORAGE.PET_VARIANT_ID);
    if (petVar != null && this.lulu && typeof this.lulu.setPetVariantId === 'function') {
      this.lulu.setPetVariantId(petVar);
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
    this.gamePrefs = normalizeGamePrefs(this.storage.get('game_prefs'));
    this._syncCritDayWithCalendar();
    this.wishManager.deserialize(this.storage.get('wish_data'));
    this.wishManager.checkDailyReset();
    this.petStateManager.deserialize(this.storage.get('pet_state_data'));

    // 注入 PetStateManager 到 Lulu
    this.lulu.setPetStateManager(this.petStateManager);

    // === 日终结算 ===
    const today = this.goalManager.getTodayString();
    const lastActive = this.goalManager.lastResetDate || today;
    const disconnectDays = daysBetween(lastActive, today);

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
    if (this.lulu && typeof this.lulu.petVariantId === 'number') {
      this.storage.set(GLOBAL_STORAGE.PET_VARIANT_ID, this.lulu.petVariantId);
    }
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
    this.storage.set('game_prefs', this.gamePrefs);
  }

  getMotionTier() {
    return (this.gamePrefs && this.gamePrefs.motionTier) || 'standard';
  }

  getGoalCritEnabled() {
    return Boolean(this.gamePrefs && this.gamePrefs.goalCritEnabled);
  }

  setMotionTier(tier) {
    if (!this.gamePrefs) this.gamePrefs = normalizeGamePrefs(null);
    this.gamePrefs.motionTier = tier === 'low' || tier === 'high' ? tier : 'standard';
    this.saveData();
  }

  setGoalCritEnabled(enabled) {
    if (!this.gamePrefs) this.gamePrefs = normalizeGamePrefs(null);
    this.gamePrefs.goalCritEnabled = Boolean(enabled);
    this.saveData();
  }

  _syncCritDayWithCalendar() {
    if (!this.gamePrefs || !this.goalManager) return;
    const today = this.goalManager.getTodayString();
    if (this.gamePrefs.critDay !== today) {
      this.gamePrefs.critDay = today;
      this.gamePrefs.critCount = 0;
    }
  }

  /** 完成目标（今日承诺） */
  completeGoal(goalId) {
    const commitments = this.goalManager.getTodayCommitments();
    const commit = commitments.find(c => c.goalId === goalId);
    if (!commit || commit.completed) return { success: false, reason: 'invalid' };
    const goal = this.goalManager.getGoalById(goalId);

    // 查找对应心愿并完成
    const wish = this.wishManager.getTodayWishes().find(w => w.goalId === goalId);
    const extraReward = wish ? 5 : 0;
    this._syncCritDayWithCalendar();
    const xpBreakdownBase = this.goalManager.calculateGoalXp(goalId, this.petStateManager.moodValue, extraReward);
    let critBonus = 0;
    let critApplied = false;
    const critOn = this.getGoalCritEnabled();
    const critCount = (this.gamePrefs && this.gamePrefs.critCount) || 0;
    if (critOn && critCount < GOAL_CRIT_DAILY_CAP && Math.random() < GOAL_CRIT_CHANCE) {
      critBonus = Math.min(10, Math.max(3, Math.floor(xpBreakdownBase.total * 0.34)));
      critApplied = true;
      this.gamePrefs.critCount = critCount + 1;
      this.gamePrefs.critDay = this.goalManager.getTodayString();
    }
    const xp = Math.min(40, xpBreakdownBase.total + critBonus);
    const xpBreakdown = {
      ...xpBreakdownBase,
      critBonus,
      total: xp,
    };

    this.goalManager.completeCommitment(goalId);
    let wishReward = null;
    if (wish) {
      wishReward = this.wishManager.completeWish(wish.id);
    }
    const levelBefore = this.growth.level;
    this.growth.addXp(xp);
    if (this.growth.level > this.lulu.level) {
      this.lulu.level = this.growth.level;
    }
    if (this.growth.level > levelBefore) {
      this.lulu.say(`${this.getLuluName()}升级啦！`, 100);
    }
    const leveledUp = this.growth.level > levelBefore;
    const majorEvolution = leveledUp && MAJOR_EVOLUTION_LEVELS.includes(this.growth.level);
    if (leveledUp && this.lulu && typeof this.lulu.onLevelUp === 'function') {
      this.lulu.onLevelUp({
        level: this.growth.level,
        majorEvolution,
      });
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
    if (this.lulu && typeof this.lulu.onGoalCompleted === 'function') {
      this.lulu.onGoalCompleted(goal ? goal.name : '目标');
    }

    // 30%概率触发酷炫动作
    if (Math.random() < COOL_ACTION_PROB) {
      const actions = this.lulu.unlockedActions || [];
      if (actions.length > 0) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        this.lulu.playCoolAction(action.id);
      }
    }

    if (critApplied && critBonus > 0 && this.lulu && typeof this.lulu.say === 'function' && !leveledUp) {
      this.lulu.say('暴击经验！', 72);
    }

    this.saveData();
    this._goalUndoState[goalId] = {
      expiresAt: Date.now() + GOAL_UNDO_WINDOW_MS,
      xpAwarded: xp,
      moodBoost,
      wishId: wish ? wish.id : null,
      addedLoveStar: Boolean(wishReward && wishReward.loveStar),
      critApplied,
    };
    return {
      success: true,
      goal,
      wishReward,
      xpAwarded: xp,
      xpBreakdown,
      visualFx: {
        goalId,
        xp,
        moodBoost,
        leveledUp,
        majorEvolution,
        level: this.growth.level,
        crit: critApplied,
        critBonus,
      },
    };
  }

  undoGoal(goalId) {
    const undoState = this._goalUndoState[goalId];
    if (!undoState) return { success: false, reason: 'missing' };
    if (Date.now() > undoState.expiresAt) {
      delete this._goalUndoState[goalId];
      return { success: false, reason: 'expired' };
    }
    const undone = this.goalManager.undoCompleteCommitment(goalId);
    if (!undone) return { success: false, reason: 'already-undone' };

    if (undoState.wishId) {
      this.wishManager.undoCompleteWish(undoState.wishId);
    }

    if (undoState.xpAwarded) {
      this.growth.addXp(-undoState.xpAwarded);
      this.lulu.level = this.growth.level;
    }
    if (undoState.moodBoost) {
      this.petStateManager.adjustMood(-undoState.moodBoost);
      this.lulu.moodValue = this.petStateManager.moodValue;
    }
    if (undoState.addedLoveStar) {
      this.growth.loveStars = Math.max(0, (this.growth.loveStars || 0) - 1);
    }

    if (undoState.critApplied && this.gamePrefs) {
      const today = this.goalManager.getTodayString();
      if (this.gamePrefs.critDay === today && (this.gamePrefs.critCount || 0) > 0) {
        this.gamePrefs.critCount -= 1;
      }
    }

    if (this.lulu) {
      this.lulu.say('刚刚那次先不算，我们继续来', 90);
    }
    delete this._goalUndoState[goalId];
    this.saveData();
    return { success: true, goalId };
  }

  canUndoGoal(goalId) {
    const state = this._goalUndoState[goalId];
    return Boolean(state && Date.now() <= state.expiresAt);
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
    if (this.lulu) {
      this.lulu.motionTier = this.getMotionTier();
    }
    this.lulu.update();

    // 在线计时：每分钟+1 XP
    const now = Date.now();
    if (this._lastOnlineXPTime && now - this._lastOnlineXPTime >= ONLINE_XP_INTERVAL) {
      const before = this.growth.level;
      this.growth.addXp(1);
      this._onlineXP += 1;
      this._lastOnlineXPTime = now;
      if (this.growth.level > before) {
        this.lulu.level = this.growth.level;
        this.lulu.say(`${this.getLuluName()}升级啦！`, 100);
      }
      if (this._onlineXP > 0 && this._onlineXP % 5 === 0) {
        if (typeof wx !== 'undefined' && wx.showToast) {
          wx.showToast({ title: `${this.getLuluName()}陪你涨了 +${this._onlineXP} XP`, icon: 'none', duration: 1500 });
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
