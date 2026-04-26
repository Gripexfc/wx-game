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
const { recordVisitInteraction } = require('./services/cloud/visit');
const { sendCheer } = require('./services/cloud/cheer');
const { createShareToken, resolveSceneToken } = require('./services/cloud/share');
const { followUser } = require('./services/cloud/social');
const { buildGrowthSnapshot } = require('./services/growthService');
const { buildSocialSnapshot, fetchSocialSnapshot } = require('./services/socialService');
const { createCompletionMoment } = require('./services/momentService');
const { buildInboxSnapshot, fetchInboxSnapshot } = require('./services/inboxService');

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
const HOME_SNAPSHOT_SYNC_INTERVAL = 15000;
const HOME_INBOX_LAST_READ_AT_KEY = 'home_inbox_last_read_at';
const HOME_HANDLED_ITEMS_KEY = 'home_inbox_handled_items';
const HOME_UI_EVENTS_KEY = 'home_ui_events_log';

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
    this._latestMoment = null;
    this._homeSnapshot = null;
    this._homeSnapshotSyncing = false;
    this._lastHomeSnapshotSyncAt = 0;
    this._inboxLastReadAt = 0;
    this._handledInboxItems = {};
    this._uiEventLogs = [];
    this._pendingShareContext = null;

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
    this._refreshHomeSnapshot();
    this._syncHomeCloudSnapshot();
    this._handleLaunchShareToken();

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
    this._refreshHomeSnapshot();
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
      this._emitHomeEvent('GOAL_CREATED', { goal });
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
    this._inboxLastReadAt = Number(this.storage.get(HOME_INBOX_LAST_READ_AT_KEY)) || 0;
    this._handledInboxItems = this.storage.get(HOME_HANDLED_ITEMS_KEY) || {};
    this._uiEventLogs = this.storage.get(HOME_UI_EVENTS_KEY) || [];
    if (!name || !String(name).trim()) {
      this.currentPage = 'onboarding';
      this.onboardingPage.setLulu(this.lulu);
      this._refreshHomeSnapshot();
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
    this._refreshHomeSnapshot();
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
    this.storage.set(HOME_INBOX_LAST_READ_AT_KEY, this._inboxLastReadAt || 0);
    this.storage.set(HOME_HANDLED_ITEMS_KEY, this._handledInboxItems || {});
    this.storage.set(HOME_UI_EVENTS_KEY, this._uiEventLogs || []);
  }

  _refreshHomeSnapshot() {
    const previous = this._homeSnapshot || {};
    this._homeSnapshot = {
      growth: buildGrowthSnapshot(this),
      social: previous.social || buildSocialSnapshot(this),
      inbox: previous.inbox || buildInboxSnapshot(null),
      latestMoment: this._latestMoment,
    };
  }

  _syncGrowthProgressToCloud() {
    const streakDays = this.goalManager && typeof this.goalManager.getStreakDays === 'function'
      ? this.goalManager.getStreakDays()
      : 0;
    const todayDoneCount = this.goalManager && typeof this.goalManager.getTodayCompletedCount === 'function'
      ? this.goalManager.getTodayCompletedCount()
      : 0;
    upsertUserProfile({
      level: this.growth ? this.growth.level : 1,
      todayDoneCount,
      streakDays,
    }).catch(() => {});
  }

  _emitHomeEvent(type, payload) {
    if (type === 'TASK_COMPLETED') {
      const goal = payload && payload.goal;
      const visualFx = payload && payload.visualFx;
      this._latestMoment = createCompletionMoment(goal, visualFx);
    }
    if (type === 'TASK_UNDONE') {
      this._latestMoment = null;
    }
    if (type === 'TASK_COMPLETED') {
      this._prepareShareContext(payload && payload.goal);
    }
    this._refreshHomeSnapshot();
    this._syncHomeCloudSnapshot();
  }

  getHomeSnapshot() {
    if (!this._homeSnapshot) this._refreshHomeSnapshot();
    return this._homeSnapshot;
  }

  async triggerQuickVisit(target) {
    if (!target || !target.hostOpenId) {
      return { success: false, code: 'NO_TARGET' };
    }
    const res = await this._runWithRetry(() => recordVisitInteraction({
      hostOpenId: target.hostOpenId,
      entrySource: 'home_social_pulse',
    }), 1);
    await this._syncHomeCloudSnapshot();
    return res;
  }

  async triggerQuickCheer(target) {
    if (!target || !target.hostOpenId) {
      return { success: false, code: 'NO_TARGET' };
    }
    const res = await this._runWithRetry(() => sendCheer({
      toOpenId: target.hostOpenId,
      source: 'home_social_pulse',
    }), 1);
    await this._syncHomeCloudSnapshot();
    return res;
  }

  async triggerShareFromMoment() {
    if (!this._pendingShareContext) {
      return { success: false, code: 'NO_MOMENT' };
    }
    const tokenRes = await createShareToken({ ttlDays: 7 });
    if (!tokenRes || !tokenRes.success) return tokenRes || { success: false, code: 'SHARE_TOKEN_FAIL' };
    const token = tokenRes.data && tokenRes.data.token;
    const title = this._pendingShareContext.title || '我今天完成了一个目标';
    const imageUrl = '';
    const query = token ? `token=${encodeURIComponent(token)}` : '';
    if (typeof wx !== 'undefined' && typeof wx.shareAppMessage === 'function') {
      try {
        wx.shareAppMessage({
          title,
          query,
          imageUrl,
        });
      } catch (e) {
        return { success: false, code: 'SHARE_CALL_FAIL', message: String(e && e.message ? e.message : e) };
      }
    } else {
      return { success: false, code: 'SHARE_UNAVAILABLE' };
    }
    this.trackUiEvent('share_triggered', { token: Boolean(token), title });
    return { success: true, token };
  }

  _prepareShareContext(goal) {
    this._pendingShareContext = {
      goalName: goal && goal.name ? goal.name : '今日目标',
      title: `我刚完成「${goal && goal.name ? goal.name : '今日目标'}」，一起坚持吗？`,
      at: Date.now(),
    };
  }

  async _handleLaunchShareToken() {
    if (typeof wx === 'undefined' || typeof wx.getLaunchOptionsSync !== 'function') return;
    let launch = null;
    try {
      launch = wx.getLaunchOptionsSync();
    } catch (e) {
      return;
    }
    const token = launch && launch.query && launch.query.token;
    if (!token) return;
    const resolved = await resolveSceneToken({ token });
    if (!resolved || !resolved.success || !resolved.data || !resolved.data.hostOpenId) {
      if (wx.showToast) wx.showToast({ title: '分享链接已失效', icon: 'none', duration: 1200 });
      return;
    }
    const hostOpenId = resolved.data.hostOpenId;
    if (wx.showModal) {
      wx.showModal({
        title: '来自好友的邀请',
        content: '要不要先关注对方，加入一起坚持？',
        confirmText: '立即关注',
        cancelText: '稍后再说',
        success: async (res) => {
          if (!res.confirm) return;
          const f = await followUser({ followeeOpenId: hostOpenId });
          if (wx.showToast) {
            wx.showToast({ title: f && f.success ? '已关注' : '关注失败', icon: 'none', duration: 1200 });
          }
          this._syncHomeCloudSnapshot();
        },
      });
    }
  }

  markInboxAsRead() {
    if (!this._homeSnapshot || !this._homeSnapshot.inbox) return;
    this._inboxLastReadAt = Date.now();
    this.saveData();
    this._homeSnapshot = {
      ...this._homeSnapshot,
      inbox: {
        ...this._homeSnapshot.inbox,
        unreadCount: 0,
      },
    };
  }

  markInboxItemHandled(itemId) {
    if (!itemId) return;
    this._handledInboxItems[itemId] = Date.now();
    this.saveData();
  }

  trackUiEvent(eventName, payload) {
    const name = String(eventName || '').trim();
    if (!name) return;
    const entry = {
      event: name,
      at: Date.now(),
      payload: payload && typeof payload === 'object' ? payload : {},
    };
    this._uiEventLogs.push(entry);
    if (this._uiEventLogs.length > 200) {
      this._uiEventLogs = this._uiEventLogs.slice(-200);
    }
    this.saveData();
  }

  isInboxItemHandled(itemId) {
    if (!itemId) return false;
    return Boolean(this._handledInboxItems && this._handledInboxItems[itemId]);
  }

  async _syncHomeCloudSnapshot() {
    if (this._homeSnapshotSyncing) return;
    this._homeSnapshotSyncing = true;
    try {
      const [social, inbox] = await Promise.all([
        fetchSocialSnapshot(),
        fetchInboxSnapshot(),
      ]);
      if (!this._homeSnapshot) this._refreshHomeSnapshot();
      this._homeSnapshot = {
        growth: this._homeSnapshot.growth,
        social: social || buildSocialSnapshot(this),
        inbox: {
          ...(inbox || buildInboxSnapshot(null)),
          unreadCount: this._calcInboxUnreadCount(inbox || buildInboxSnapshot(null)),
        },
        latestMoment: this._latestMoment,
      };
      this._lastHomeSnapshotSyncAt = Date.now();
    } catch (e) {
      // Ignore cloud sync failures and keep local snapshot.
    } finally {
      this._homeSnapshotSyncing = false;
    }
  }

  async refreshHomeCloudSnapshot() {
    return this._syncHomeCloudSnapshot();
  }

  _calcInboxUnreadCount(inbox) {
    const data = inbox || {};
    const all = []
      .concat(Array.isArray(data.cheerItems) ? data.cheerItems : [])
      .concat(Array.isArray(data.visitItems) ? data.visitItems : [])
      .concat(Array.isArray(data.pendingItems) ? data.pendingItems : []);
    return all.filter((item) => {
      const id = item && item.id;
      if (id && this.isInboxItemHandled(id)) return false;
      return Number(item && item.createdAt) > (this._inboxLastReadAt || 0);
    }).length;
  }

  async _runWithRetry(taskFn, retries) {
    let count = 0;
    let lastRes = null;
    while (count <= retries) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await taskFn();
        if (res && res.success) return res;
        lastRes = res;
      } catch (e) {
        lastRes = { success: false, code: 'NETWORK_ERROR', message: String(e && e.message ? e.message : e) };
      }
      count += 1;
    }
    return lastRes || { success: false, code: 'UNKNOWN' };
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
    this._emitHomeEvent('TASK_COMPLETED', {
      goal,
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
    });
    this._syncGrowthProgressToCloud();
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
    this._emitHomeEvent('TASK_UNDONE', { goalId });
    this._syncGrowthProgressToCloud();
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
      this._refreshHomeSnapshot();
    }
    if (now - this._lastHomeSnapshotSyncAt >= HOME_SNAPSHOT_SYNC_INTERVAL) {
      this._syncHomeCloudSnapshot();
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
