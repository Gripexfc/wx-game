const { COLORS, LULU_STAGES, SCENES } = require('../../utils/constants');

class GalleryPage {
  constructor(game) {
    this.game = game;
  }

  render(ctx, canvasWidth, canvasHeight) {
    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 标题
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('噜噜图鉴', canvasWidth / 2, 50);

    // 返回按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('< 返回', 20, 35);

    // 当前噜噜展示
    const lulu = this.game.lulu;
    if (lulu) {
      lulu.update();
      lulu.draw(ctx, canvasWidth / 2, 160);

      // 等级名称
      ctx.fillStyle = COLORS.TEXT_PRIMARY;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`${lulu.getStage().name}  Lv.${lulu.level}`, canvasWidth / 2, 280);
    }

    // 成长阶段
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('成长阶段', 30, 320);

    let stageY = 350;
    for (const [id, stage] of Object.entries(LULU_STAGES)) {
      const isUnlocked = lulu.level >= stage.level[0];
      ctx.fillStyle = isUnlocked ? COLORS.PRIMARY : '#CCC';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${isUnlocked ? '✓' : '○'} ${stage.name}`, 30, stageY);
      ctx.fillText(`Lv.${stage.level[0]}-${stage.level[1]}`, 150, stageY);
      stageY += 30;
    }

    // 场景
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('已解锁场景', 30, stageY + 20);

    let sceneY = stageY + 50;
    const growth = this.game.growth;
    for (const [id, scene] of Object.entries(SCENES)) {
      const isUnlocked = growth.unlockedScenes.includes(id);
      ctx.fillStyle = isUnlocked ? COLORS.SECONDARY : '#CCC';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${isUnlocked ? '🖼️' : '🔒'} ${scene.name}`, 30, sceneY);
      ctx.fillText(`Lv.${scene.unlockLevel}+`, 150, sceneY);
      sceneY += 30;
    }

    // 爱心币
    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`❤️ ${growth.loveCoins}`, canvasWidth - 30, 50);
  }

  handleClick(x, y, canvasWidth, canvasHeight) {
    // 返回按钮
    if (x < 80 && y < 50) {
      this.game.showHomePage();
      return true;
    }
    return false;
  }
}

module.exports = GalleryPage;
