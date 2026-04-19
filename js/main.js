// 人生拾光 - 微信小游戏主入口
import './render';

const { GAME_STATE, BOARD_SIZE, TILE_SIZE, TILE_GAP, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');
const UIManager = require('../ui/UIManager');
const LevelSystem = require('../systems/Level');
const ProgressManager = require('../models/Progress');
const { AchievementManager } = require('../models/Achievement');
const { AudioManager } = require('../audio/AudioManager');
const { AdManager } = require('../ads/AdManager');
const MatchEngine = require('../core/MatchEngine');
const { Board } = require('../models/Board');

/** 获取主屏幕画布（部分模拟器/基础库下全局 canvas 尚未就绪，需回退 createCanvas） */
function obtainMainCanvas() {
  try {
    if (typeof canvas !== 'undefined' && canvas) {
      return canvas;
    }
  } catch (e) {
    // 忽略：个别环境下未注入 canvas 标识符会抛 ReferenceError
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

/** 下一帧调度（部分 Mac 模拟器/子上下文无 wx.requestAnimationFrame） */
function scheduleNextFrame(fn) {
  if (typeof wx !== 'undefined' && typeof wx.requestAnimationFrame === 'function') {
    return wx.requestAnimationFrame(fn);
  }
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(fn);
  }
  return setTimeout(fn, 16);
}

class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this._canvasSized = false;
    this._bindMainCanvas();
    this.state = GAME_STATE.BOOT;
    this.progress = null;
    this.achievement = null;
    this.audio = null;
    this.ad = null;
    this.levelSystem = null;
    this.uiManager = null;
    this.currentLevel = 1;
    this.score = 0;
    this.engine = null;
    this.board = null;
    this.selectedTile = null;
    this.touchStartX = 0;
    this.touchStartY = 0;

    this.init();
  }

  _bindMainCanvas() {
    const c = obtainMainCanvas();
    if (!c) return;
    this.canvas = c;
    this.ctx = c.getContext('2d');
    if (!this.ctx) return;
    if (!this._canvasSized && (!c.width || !c.height) && typeof wx !== 'undefined' && wx.getSystemInfoSync) {
      try {
        const sys = wx.getSystemInfoSync();
        const w = Math.floor(sys.windowWidth || GAME_WIDTH);
        const h = Math.floor(sys.windowHeight || GAME_HEIGHT);
        if (w > 0 && h > 0) {
          c.width = w;
          c.height = h;
        }
      } catch (e) {
        c.width = GAME_WIDTH;
        c.height = GAME_HEIGHT;
      }
      this._canvasSized = true;
    }
  }

  init() {
    console.log('Initializing game...');

    // 初始化管理器
    this.progress = new ProgressManager();
    this.achievement = new AchievementManager();
    this.audio = new AudioManager();
    this.ad = new AdManager();
    this.levelSystem = new LevelSystem();
    this.uiManager = new UIManager(this);

    // 设置成就监听
    this.achievement.addListener((event) => {
      if (event.type === 'unlock') {
        console.log('Achievement unlocked:', event.achievement.name);
        this.audio.playAchievementUnlock?.();
      }
    });

    // 初始化广告
    this.ad.init(
      'YOUR_REWARDED_VIDEO_AD_UNIT_ID',
      'YOUR_INTERSTITIAL_AD_UNIT_ID'
    );

    // 设置触摸处理
    this.setupTouchHandlers();

    // 显示启动界面
    this.uiManager.showBoot();

    // 启动游戏循环
    this.gameLoop();

    console.log('Game started successfully');
  }

  setupTouchHandlers() {
    wx.onTouchStart((res) => {
      if (res.touches.length > 0) {
        const touch = res.touches[0];
        this.handleTouchStart(touch.clientX, touch.clientY);
      }
    });

    wx.onTouchMove((res) => {
      if (res.touches.length > 0) {
        const touch = res.touches[0];
        this.handleTouchMove(touch.clientX, touch.clientY);
      }
    });

    wx.onTouchEnd(() => {
      this.handleTouchEnd();
    });
  }

  handleTouchStart(x, y) {
    // 尝试传递给 UI 处理
    if (this.uiManager.handleClick(x, y)) {
      return;
    }

    // 游戏中的触摸处理
    if (this.state === GAME_STATE.PLAYING && this.board) {
      const tile = this.getTileAt(x, y);
      if (tile) {
        this.selectedTile = tile;
        this.touchStartX = x;
        this.touchStartY = y;
        this.touchEndX = x;
        this.touchEndY = y;
      }
    }
  }

  handleTouchMove(x, y) {
    this.touchEndX = x;
    this.touchEndY = y;
  }

  handleTouchEnd() {
    if (!this.selectedTile) return;

    const endX = this.touchEndX != null ? this.touchEndX : this.touchStartX;
    const endY = this.touchEndY != null ? this.touchEndY : this.touchStartY;
    const dx = endX - this.touchStartX;
    const dy = endY - this.touchStartY;
    const threshold = TILE_SIZE / 2;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      let targetRow = this.selectedTile.row;
      let targetCol = this.selectedTile.col;

      if (Math.abs(dx) > Math.abs(dy)) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }

      this.trySwap(this.selectedTile.row, this.selectedTile.col, targetRow, targetCol);
    }

    this.selectedTile = null;
  }

  getTileAt(screenX, screenY) {
    if (!this.board) return null;

    const boardWidth = BOARD_SIZE * (TILE_SIZE + TILE_GAP);
    const boardX = (this.canvas.width - boardWidth) / 2;
    const boardY = 120;

    const col = Math.floor((screenX - boardX) / (TILE_SIZE + TILE_GAP));
    const row = Math.floor((screenY - boardY) / (TILE_SIZE + TILE_GAP));

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      return this.board.getTile(row, col);
    }
    return null;
  }

  async trySwap(row1, col1, row2, col2) {
    if (!this.board) return;
    if (
      row2 < 0 ||
      row2 >= BOARD_SIZE ||
      col2 < 0 ||
      col2 >= BOARD_SIZE
    ) {
      return;
    }

    const swapped = this.board.swap(row1, col1, row2, col2);
    if (!swapped) return;

    await this.delay(150);

    const matches = this.board.findMatches();
    if (matches.length === 0) {
      this.board.swap(row1, col1, row2, col2);
      await this.delay(150);
      return;
    }

    await this.processMatches();
  }

  async processMatches() {
    if (!this.board) return;

    let matches = this.board.findMatches();

    while (matches.length > 0) {
      this.board.markMatches(matches);

      let scoreGained = 0;
      matches.forEach(match => {
        scoreGained += match.length * 10;
      });
      this.score += scoreGained;
      this.progress.addScore?.(scoreGained);

      await this.delay(200);

      this.board.removeMatches();
      this.board.dropTiles();
      this.board.fillEmpty();

      await this.delay(150);

      matches = this.board.findMatches();
    }

    if (!this.board.hasPossibleMoves()) {
      this.board.init();
      this.board.fillInitial();
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  enterLevel(levelId) {
    this.currentLevel = levelId;
    this.levelSystem.loadLevel(levelId);
    this.score = 0;

    this.board = new Board();
    this.board.init();
    this.board.fillInitial();

    this.engine = new MatchEngine();
    this.engine.board = this.board;

    this.state = GAME_STATE.PLAYING;
    this.uiManager.showGame();

    this.audio.playLevelMusic?.(levelId);
  }

  completeLevel() {
    this.state = GAME_STATE.RESULT;
    this.progress.nextLevel?.();
    this.achievement.onLevelComplete?.(this.currentLevel);
    this.audio.playLevelComplete?.();
    this.uiManager.showResult([]);
  }

  gameLoop() {
    if (!this.canvas || !this.ctx) {
      this._bindMainCanvas();
    }
    if (!this.canvas || !this.ctx) {
      scheduleNextFrame(() => this.gameLoop());
      return;
    }
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 更新
    this.uiManager.update();
    this.engine?.update();

    // 渲染
    this.uiManager.render(this.ctx);

    // 继续循环
    scheduleNextFrame(() => this.gameLoop());
  }
}

export default Game;