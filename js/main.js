import './render';

const DESIGN_W = 375;
const DESIGN_H = 667;

/** 主屏画布（模拟器/子上下文下全局 canvas 可能未就绪） */
function obtainMainCanvas() {
  try {
    if (typeof canvas !== 'undefined' && canvas) {
      return canvas;
    }
  } catch (e) {
    // ignore
  }
  if (typeof GameGlobal !== 'undefined' && GameGlobal && GameGlobal.canvas) {
    return GameGlobal.canvas;
  }
  if (typeof wx !== 'undefined' && typeof wx.createCanvas === 'function') {
    try {
      return wx.createCanvas();
    } catch (e) {
      console.error('wx.createCanvas failed:', e);
    }
  }
  return null;
}

function scheduleNextFrame(fn) {
  if (typeof wx !== 'undefined' && typeof wx.requestAnimationFrame === 'function') {
    return wx.requestAnimationFrame(fn);
  }
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(fn);
  }
  return setTimeout(fn, 16);
}

const Lulu = require('./Lulu');
const TaskManager = require('./TaskManager');
const GrowthSystem = require('./GrowthSystem');
const Storage = require('./Storage');
const HomePage = require('./ui/HomePage');
const OnboardingPage = require('./ui/OnboardingPage');

const STORAGE_KEYS_LULU = {
  LULU_NAME: 'lulu_name',
};

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

    this.homePage = new HomePage(this);
    this.onboardingPage = new OnboardingPage(this);

    this.currentPage = 'home';

    this.loadData();
    this.homePage.setLulu(this.lulu);

    // 初始化 Banner 广告（占位 ID 不加载）
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
        const physW = Math.floor(cssW * dpr);
        const physH = Math.floor(cssH * dpr);
        c.width = physW;
        c.height = physH;
        this.ctx.scale(dpr, dpr);
        this._cssWidth = cssW;
        this._cssHeight = cssH;
      } catch (e) {
        c.width = DESIGN_W;
        c.height = DESIGN_H;
        this._cssWidth = DESIGN_W;
        this._cssHeight = DESIGN_H;
      }
      this._canvasSized = true;
    } else if (!this._canvasSized) {
      c.width = DESIGN_W;
      c.height = DESIGN_H;
      this._cssWidth = DESIGN_W;
      this._cssHeight = DESIGN_H;
      this._canvasSized = true;
    }
  }

  setupTouchHandlers() {
    if (typeof wx === 'undefined' || !wx.onTouchStart) return;

    const getCssSize = () => ({
      w: this._cssWidth || this.canvas.width,
      h: this._cssHeight || this.canvas.height,
    });

    wx.onTouchStart((res) => {
      if (!res.touches || res.touches.length === 0) return;
      const touch = res.touches[0];
      this._activeTouchId = touch.identifier != null ? touch.identifier : 0;
      if (!this.canvas) return;
      const { w, h } = getCssSize();
      this.handleClick(touch.clientX, touch.clientY);
    });

    wx.onTouchMove((res) => {
      if (!this.canvas || !res.touches || res.touches.length === 0) return;
      const touch = res.touches[0];
      if (this._activeTouchId != null && touch.identifier != null && touch.identifier !== this._activeTouchId) {
        return;
      }
      const { w, h } = getCssSize();
      this.homePage.onTouchMove(touch.clientX, touch.clientY, w, h);
    });

    const end = (res) => {
      if (!this.canvas) {
        this._activeTouchId = null;
        return;
      }
      let x = 0;
      let y = 0;
      if (res.changedTouches && res.changedTouches.length > 0) {
        const c = res.changedTouches[0];
        if (this._activeTouchId != null && c.identifier != null && c.identifier !== this._activeTouchId) {
          return;
        }
        x = c.clientX;
        y = c.clientY;
      } else if (res.touches && res.touches.length > 0) {
        x = res.touches[0].clientX;
        y = res.touches[0].clientY;
      }
      const { w, h } = getCssSize();
      this.homePage.onTouchEnd(x, y, w, h);
      this._activeTouchId = null;
    };

    wx.onTouchEnd(end);
    wx.onTouchCancel(() => {
      this.homePage.onTouchCancel();
      this._activeTouchId = null;
    });
  }

  handleClick(x, y) {
    if (!this.canvas) return;
    const canvasWidth = this._cssWidth || this.canvas.width;
    const canvasHeight = this._cssHeight || this.canvas.height;
    switch (this.currentPage) {
      case 'home':
        this.homePage.handleClick(x, y, canvasWidth, canvasHeight);
        break;
      case 'onboarding':
        if (this.onboardingPage) {
          this.onboardingPage.onTouchStart(x, y, canvasWidth, canvasHeight);
        }
        break;
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

  loadData() {
    // 检测昵称：未设置则显示引导页
    const name = this.storage.get(STORAGE_KEYS_LULU.LULU_NAME);
    if (!name || !String(name).trim()) {
      this.currentPage = 'onboarding';
      this.onboardingPage.setLulu(this.lulu);
      return;
    }

    // 原有加载逻辑
    const luluData = this.storage.get('lulu_data');
    if (luluData) {
      this.lulu.level = luluData.level || 1;
      this.lulu.xp = luluData.xp || 0;
      this.lulu.moodValue = Number.isFinite(luluData.moodValue) ? luluData.moodValue : 68;
      this.lulu.todayInteractionCount = Number.isFinite(luluData.todayInteractionCount) ? luluData.todayInteractionCount : 0;
    }

    const taskData = this.storage.get('task_data');
    if (taskData) {
      this.taskManager.deserialize(taskData);
    }
    this.taskManager.checkDailyReset();

    const growthData = this.storage.get('growth_data');
    if (growthData) {
      this.growth.deserialize(growthData);
    }
    this.lulu.level = this.growth.level;
  }

  saveData() {
    this.storage.set('lulu_data', {
      level: this.lulu.level,
      xp: this.lulu.xp,
      moodValue: this.lulu.getMoodValue ? this.lulu.getMoodValue() : 68,
      todayInteractionCount: this.lulu.todayInteractionCount || 0,
    });
    this.storage.set('task_data', this.taskManager.serialize());
    this.storage.set('growth_data', this.growth.serialize());
  }

  completeTask(taskId) {
    const result = this.taskManager.toggleTask(taskId);
    if (result.xpDelta !== 0) {
      const xpResult = this.growth.addXp(result.xpDelta);
      if (result.xpDelta > 0 && result.completed) {
        // 完成任务奖励
        if (this.lulu.onOwnerFinishedTask) {
          const task = this.taskManager.getTodayTasks().find(t => t.id === taskId);
          this.lulu.onOwnerFinishedTask(task?.name || '任务');
        }
      }
      if (result.xpDelta < 0) {
        // 取消完成：等级可能回退
        this.lulu.level = this.growth.level;
      } else if (xpResult.leveled) {
        this.lulu.level = xpResult.newLevel;
      }
      this.saveData();
    }
  }

  onLuluInteraction() {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      try {
        wx.vibrateShort({ type: 'light' });
      } catch (e) {
        // ignore
      }
    }
  }

  loop() {
    if (!this.canvas || !this.ctx) {
      this._bindMainCanvas();
    }
    if (!this.canvas || !this.ctx) {
      scheduleNextFrame(() => this.loop());
      return;
    }
    this.update();
    this.render();
    scheduleNextFrame(() => this.loop());
  }

  update() {
    this.lulu.update();
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const canvasWidth = this._cssWidth || this.canvas.width;
    const canvasHeight = this._cssHeight || this.canvas.height;
    switch (this.currentPage) {
      case 'home':
        this.homePage.render(this.ctx, canvasWidth, canvasHeight);
        break;
      case 'onboarding':
        if (this.onboardingPage) {
          this.onboardingPage.render(this.ctx, canvasWidth, canvasHeight);
        }
        break;
    }
  }
}

export default Game;
