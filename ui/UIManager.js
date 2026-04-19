// UI 层级管理器
const { GAME_STATE, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');
const BootScreen = require('./BootScreen');
const MainMenu = require('./MainMenu');
const LevelSelect = require('./LevelSelect');
const GameView = require('./GameView');
const HUD = require('./HUD');
const ResultPopup = require('./ResultPopup');
const Gallery = require('./Gallery');
const Report = require('./Report');

class UIManager {
  constructor(game) {
    this.game = game;
    this.screens = {
      boot: new BootScreen(this),
      menu: new MainMenu(this),
      levelSelect: new LevelSelect(this),
      gameView: new GameView(this),
      hud: new HUD(this),
      result: new ResultPopup(this),
      gallery: new Gallery(this),
      report: new Report(this),
    };
    this.currentScreen = null;
    this.screenStack = [];
  }

  showBoot() {
    this.currentScreen = 'boot';
    this.screens.boot.show();
  }

  showMenu() {
    this.currentScreen = 'menu';
    this.screens.menu.show();
  }

  showLevelSelect() {
    this.currentScreen = 'levelSelect';
    this.screens.levelSelect.show();
  }

  showGame() {
    this.currentScreen = 'gameView';
    this.screens.gameView.show();
    this.screens.hud.show();
  }

  hideGame() {
    this.screens.gameView.hide();
    this.screens.hud.hide();
  }

  showPause() {
    this.currentScreen = 'pause';
    // TODO: 暂停面板
  }

  showResult(fragments) {
    this.currentScreen = 'result';
    this.screens.result.show(fragments);
  }

  showGallery() {
    this.currentScreen = 'gallery';
    this.screens.gallery.show();
  }

  showReport() {
    this.currentScreen = 'report';
    this.screens.report.show();
  }

  // 处理点击事件
  handleClick(x, y) {
    if (this.currentScreen === 'gameView') {
      const hud = this.screens.hud;
      if (hud && hud.handleClick && hud.handleClick(x, y)) {
        return true;
      }
    }
    const screen = this.screens[this.currentScreen];
    if (screen && screen.handleClick) {
      return screen.handleClick(x, y);
    }
    return false;
  }

  update() {
    if (this.currentScreen === 'gameView') {
      this.screens.gameView?.update?.();
      this.screens.hud?.update?.();
      return;
    }
    const screen = this.screens[this.currentScreen];
    if (screen && screen.update) {
      screen.update();
    }
  }

  render(ctx) {
    if (this.currentScreen === 'gameView') {
      const gameView = this.screens.gameView;
      const hud = this.screens.hud;
      if (gameView && gameView.render) gameView.render(ctx);
      if (hud && hud.render) hud.render(ctx);
      return;
    }
    const screen = this.screens[this.currentScreen];
    if (screen && screen.render) {
      screen.render(ctx);
    }
  }

  // 统一的按钮点击检测
  isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }

  // 根据游戏状态切换界面
  switchToState(gameState) {
    switch (gameState) {
      case GAME_STATE.BOOT:
        this.showBoot();
        break;
      case GAME_STATE.MENU:
        this.showMenu();
        break;
      case GAME_STATE.LEVEL_SELECT:
        this.showLevelSelect();
        break;
      case GAME_STATE.PLAYING:
        this.showGame();
        break;
      case GAME_STATE.PAUSED:
        this.showPause();
        break;
      case GAME_STATE.RESULT:
        this.showResult([]);
        break;
      case GAME_STATE.GALLERY:
        this.showGallery();
        break;
      case GAME_STATE.REPORT:
        this.showReport();
        break;
      default:
        this.showMenu();
    }
  }
}

module.exports = UIManager;
