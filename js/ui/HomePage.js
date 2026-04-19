const { COLORS } = require('../utils/constants');

class HomePage {
  constructor(game) {
    this.game = game;
    this.lulu = null;
  }

  setLulu(lulu) {
    this.lulu = lulu;
  }

  // 点击检测
  handleClick(x, y, canvasWidth, canvasHeight) {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2 - 50;
    const size = this.lulu ? this.lulu.getSize() : 100;

    // 点击噜噜区域
    if (x > centerX - size && x < centerX + size &&
        y > centerY - size && y < centerY + size) {
      this.onLuluClick();
      return true;
    }

    // 点击任务按钮
    if (x > canvasWidth - 80 && x < canvasWidth - 20 &&
        y > 20 && y < 60) {
      this.game.showTaskPage();
      return true;
    }

    // 点击图鉴按钮
    if (x > 20 && x < 80 && y > 20 && y < 60) {
      this.game.showGalleryPage();
      return true;
    }

    return false;
  }

  onLuluClick() {
    if (this.lulu) {
      this.lulu.triggerRandomAction();
    }
    this.game.onLuluInteraction();
  }

  // 绘制
  render(ctx, canvasWidth, canvasHeight) {
    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制噜噜
    if (this.lulu) {
      this.lulu.update();
      this.lulu.draw(ctx, canvasWidth / 2, canvasHeight / 2 - 50);
    }

    // 绘制等级和经验条
    this.drawStatusBar(ctx, canvasWidth);

    // 绘制按钮
    this.drawButtons(ctx, canvasWidth);

    // 绘制互动文字
    if (this.lulu && this.lulu.action) {
      this.drawActionText(ctx, canvasWidth / 2, canvasHeight / 2 + 100);
    }
  }

  drawStatusBar(ctx, canvasWidth) {
    const barWidth = 200;
    const barHeight = 20;
    const x = (canvasWidth - barWidth) / 2;
    const y = canvasHeight - 150;

    const growth = this.game.growth;
    const progress = growth.getXpProgress();

    // 等级文字
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${growth.level} ${growth.getStage().name}`, canvasWidth / 2, y - 10);

    // 经验条背景
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(x, y, barWidth, barHeight);

    // 经验条填充
    ctx.fillStyle = COLORS.SECONDARY;
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    // XP 文字
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    ctx.fillText(`${growth.xp}/${growth.getXpForNextLevel()} XP`, canvasWidth / 2, y + barHeight + 15);
  }

  drawButtons(ctx, canvasWidth) {
    // 任务按钮
    ctx.fillStyle = COLORS.ACCENT;
    this.roundRect(ctx, canvasWidth - 80, 20, 60, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('任务', canvasWidth - 50, 48);

    // 图鉴按钮
    ctx.fillStyle = COLORS.SECONDARY;
    this.roundRect(ctx, 20, 20, 60, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText('图鉴', 50, 48);
  }

  drawActionText(ctx, x, y) {
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.lulu.getActionText(), x, y);
  }

  roundRect(ctx, x, y, w, h, r) {
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
}

module.exports = HomePage;