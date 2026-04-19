// 游戏内信息栏
const { COLORS, GAME_WIDTH } = require('../utils/constants');

class HUD {
  constructor(uiManager) {
    this.ui = uiManager;
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  handleClick(x, y) {
    const w = this.ui.game?.canvas?.width || GAME_WIDTH;
    // 暂停按钮
    if (x >= w - 50 && x <= w - 10 && y >= 15 && y <= 45) {
      this.ui.game?.audio?.playUIClick?.();
      this.ui.showPause?.();
      return true;
    }
    return false;
  }

  render(ctx) {
    if (!this.visible) return;

    const w = ctx.canvas?.width || GAME_WIDTH;

    // 顶部信息栏背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, w, 60);

    const game = this.ui.game;
    const level = game?.currentLevel || 1;
    const score = game?.score || 0;

    // 关卡信息
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`关卡 ${level}`, 20, 35);

    // 分数
    ctx.textAlign = 'center';
    ctx.fillText(`分数: ${score}`, w / 2, 35);

    // 暂停按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⏸', w - 20, 35);
  }

  update() {}
}

module.exports = HUD;
