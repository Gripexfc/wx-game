// 成长图鉴
const { COLORS, GAME_WIDTH, GAME_HEIGHT, TILE_TYPES, TILE_TYPE_KEYS } = require('../utils/constants');

class Gallery {
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

    // 返回按钮
    if (x < 50 && y < 50) {
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
    ctx.fillText('成长图鉴', w / 2, 40);

    // 碎片展示
    let index = 0;
    for (const typeKey of TILE_TYPE_KEYS) {
      const type = TILE_TYPES[typeKey];
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 40 + col * 100;
      const y = 80 + row * 100;

      const collected = this.ui.game?.progress?.getFragmentCount?.(typeKey) || 0;

      // 碎片圆形
      ctx.fillStyle = collected > 0 ? type.color : '#E0E0E0';
      ctx.beginPath();
      ctx.arc(x + 30, y + 30, 25, 0, Math.PI * 2);
      ctx.fill();

      // 碎片数量
      ctx.fillStyle = collected > 0 ? '#FFFFFF' : '#999999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`x${collected}`, x + 30, y + 55);

      // 碎片名称
      ctx.fillStyle = COLORS.TEXT_PRIMARY;
      ctx.font = '10px sans-serif';
      ctx.fillText(type.name.split('·')[1] || type.name, x + 30, y + 75);

      index++;
    }

    // 成就墙
    ctx.fillStyle = COLORS.SECONDARY;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('成就', 30, 320);

    const achievements = this.ui.game?.achievement?.getAll?.() || [];
    let achY = 350;
    for (const ach of achievements) {
      const unlocked = this.ui.game?.achievement?.isUnlocked?.(ach.id) || false;
      ctx.fillStyle = unlocked ? COLORS.PRIMARY : '#CCCCCC';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${unlocked ? '🏆' : '🔒'} ${ach.name}`, 30, achY);
      achY += 30;
    }
  }

  update() {}
}

module.exports = Gallery;
