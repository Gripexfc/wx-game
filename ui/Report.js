// 成长报告
const { COLORS, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');

class Report {
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
    if (!this.visible) return false;

    const w = this.ui.game?.canvas?.width || GAME_WIDTH;

    // 分享按钮
    if (x >= 50 && x <= w - 50 && y >= 400 && y <= 450) {
      this.ui.game?.audio?.playUIClick?.();
      if (wx?.shareAppMessage) {
        wx.shareAppMessage({
          title: '人生拾光 - 成长报告',
        });
      }
      return true;
    }

    // 返回
    if (x >= 50 && x <= w - 50 && y >= 470 && y <= 520) {
      this.ui.game?.audio?.playUIClick?.();
      this.hide();
      this.ui.showMenu();
      return true;
    }

    return false;
  }

  render(ctx) {
    if (!this.visible) return;

    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.PRIMARY);
    gradient.addColorStop(1, COLORS.ACCENT);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('成长报告', w / 2, 80);

    // 统计信息（字段与 Progress.getSummary 对齐）
    const stats = this.ui.game?.progress?.getSummary?.() || {
      totalFragments: 0,
      completedLevels: 0,
      achievementsUnlocked: 0,
      totalAchievements: 12,
    };

    ctx.font = '16px sans-serif';
    ctx.fillText(`收集碎片: ${stats.totalFragments}`, w / 2, 150);
    ctx.fillText(`当前进度: 关卡 ${stats.level || 1}`, w / 2, 180);
    ctx.fillText(`解锁成就: ${stats.achievementsUnlocked}/${stats.totalAchievements}`, w / 2, 210);

    // 寄语
    ctx.font = '14px sans-serif';
    ctx.fillText('你的人生，满是光芒', w / 2, 260);
    ctx.font = '12px sans-serif';
    ctx.fillText('每一步成长，都值得被珍藏', w / 2, 285);

    // 分享按钮
    ctx.fillStyle = '#FFFFFF';
    this._roundRect(ctx, 50, 400, w - 100, 50, 12);
    ctx.fill();
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = '14px sans-serif';
    ctx.fillText('分享给好友', w / 2, 432);

    // 返回按钮
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this._roundRect(ctx, 50, 470, w - 100, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.fillText('返回主菜单', w / 2, 502);
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

module.exports = Report;
