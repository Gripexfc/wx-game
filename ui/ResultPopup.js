// 结算弹窗
const { COLORS, GAME_WIDTH, GAME_HEIGHT, TILE_TYPES } = require('../utils/constants');

class ResultPopup {
  constructor(uiManager) {
    this.ui = uiManager;
    this.visible = false;
    this.fragments = [];
    this.showDouble = false;
  }

  show(fragments = []) {
    this.visible = true;
    this.fragments = fragments;
    this.showDouble = false;
  }

  hide() {
    this.visible = false;
  }

  handleClick(x, y) {
    if (!this.visible) return false;

    const w = this.ui.game?.canvas?.width || GAME_WIDTH;

    // 激励视频按钮
    if (x >= 50 && x <= w - 50 && y >= 320 && y <= 370) {
      this.ui.game?.audio?.playUIClick?.();
      this.ui.game?.ad?.showRewardedVideoAd?.({
        onReward: () => {
          this.fragments.forEach((f) => {
            f.count *= 2;
          });
          this.showDouble = true;
        },
      }).catch(() => {});
      return true;
    }

    // 继续按钮
    if (x >= 50 && x <= w - 50 && y >= 390 && y <= 440) {
      this.ui.game?.audio?.playUIClick?.();
      this.hide();
      this.ui.showLevelSelect();
      return true;
    }

    return false;
  }

  render(ctx) {
    if (!this.visible) return;

    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // 弹窗背景
    ctx.fillStyle = '#FFFFFF';
    this._roundRect(ctx, 30, 100, w - 60, h - 200, 20);
    ctx.fill();

    // 标题
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('恭喜过关!', w / 2, 150);

    // 获得碎片展示
    let fragY = 200;
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = '14px sans-serif';
    ctx.fillText('获得时光碎片', w / 2, fragY);
    fragY += 30;

    for (const frag of this.fragments) {
      const color = TILE_TYPES[frag.type]?.color || '#CCCCCC';
      const name = TILE_TYPES[frag.type]?.name || frag.type;
      ctx.fillStyle = color;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${name} x${frag.count}`, w / 2 - 50, fragY);
      fragY += 25;
    }

    // 双倍标签
    if (this.showDouble) {
      ctx.fillStyle = COLORS.CORAL;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('双倍奖励!', w / 2, fragY + 10);
      fragY += 25;
    }

    // 激励视频按钮
    ctx.fillStyle = COLORS.ACCENT;
    this._roundRect(ctx, 50, 320, w - 100, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('观看视频领取双倍碎片', w / 2, 352);

    // 继续按钮
    ctx.fillStyle = COLORS.PRIMARY;
    this._roundRect(ctx, 50, 390, w - 100, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('继续', w / 2, 422);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  update() {}
}

module.exports = ResultPopup;
