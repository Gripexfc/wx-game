// 关卡选择
const { COLORS, GAME_WIDTH, GAME_HEIGHT, LEVEL_STAGES } = require('../utils/constants');

class LevelSelect {
  constructor(uiManager) {
    this.ui = uiManager;
    this.selectedStage = null;
  }

  show() {
    this.selectedStage = null;
  }

  handleClick(x, y) {
    // 返回按钮
    if (x < 50 && y < 50) {
      this.ui.game?.audio?.playUIClick?.();
      this.ui.showMenu();
      return true;
    }

    // 关卡卡片
    const stages = Object.values(LEVEL_STAGES);
    let cardY = 80;
    for (const stage of stages) {
      for (const levelId of stage.levels) {
        const cardX = GAME_WIDTH / 2 - 40;
        const cardW = 80;
        const cardH = 70;
        if (x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH) {
          const isUnlocked = this.ui.game?.progress?.isLevelUnlocked?.(levelId) ?? (levelId === 1);
          if (isUnlocked) {
            this.ui.game?.audio?.playUIClick?.();
            this.ui.game?.enterLevel?.(levelId);
            return true;
          }
        }
        cardY += cardH + 10;
      }
      cardY += 20;
    }
    return false;
  }

  _isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }

  render(ctx) {
    const w = ctx.canvas?.width || GAME_WIDTH;
    const h = ctx.canvas?.height || GAME_HEIGHT;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 返回按钮
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('< 返回', 20, 35);

    // 标题
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择关卡', w / 2, 40);

    // 关卡卡片
    const stages = Object.values(LEVEL_STAGES);
    let cardY = 80;
    for (const stage of stages) {
      // 阶段标题
      ctx.fillStyle = COLORS.SECONDARY;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(stage.name, 20, cardY + 15);

      cardY += 25;

      for (const levelId of stage.levels) {
        const cardX = w / 2 - 40;
        const cardW = 80;
        const cardH = 70;
        const isUnlocked = this.ui.game?.progress?.isLevelUnlocked?.(levelId) ?? (levelId === 1);

        // 卡片背景
        ctx.fillStyle = isUnlocked ? COLORS.PRIMARY : '#CCCCCC';
        this._roundRect(ctx, cardX, cardY, cardW, cardH, 10);
        ctx.fill();

        // 关卡号
        ctx.fillStyle = isUnlocked ? '#FFFFFF' : '#999999';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(levelId.toString(), cardX + cardW / 2, cardY + cardH / 2 - 5);

        // 关卡名称
        ctx.font = '10px sans-serif';
        ctx.fillText(`关卡 ${levelId}`, cardX + cardW / 2, cardY + cardH / 2 + 15);

        cardY += cardH + 10;
      }
      cardY += 20;
    }
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
  hide() {}
}

module.exports = LevelSelect;
