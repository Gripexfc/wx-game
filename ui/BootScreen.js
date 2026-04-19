// 启动页
const { COLORS, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');

class BootScreen {
  constructor(uiManager) {
    this.ui = uiManager;
    this.alpha = 0;
    this.done = false;
  }

  show() {
    this.alpha = 0;
    this.done = false;
    this._fadeIn();
  }

  _fadeIn() {
    const fadeStep = () => {
      this.alpha += 0.02;
      if (this.alpha >= 1) {
        this.alpha = 1;
        setTimeout(() => {
          this.ui.showMenu();
        }, 500);
        return;
      }
      setTimeout(fadeStep, 16);
    };
    fadeStep();
  }

  render(ctx) {
    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Logo 文字
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('人生拾光', w / 2, h / 2 - 30);

    // 标语
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.fillText('拾光筑梦，不负韶华', w / 2, h / 2 + 10);

    ctx.globalAlpha = 1;
  }

  update() {}

  hide() {
    this.done = true;
  }
}

module.exports = BootScreen;
