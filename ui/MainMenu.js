// 主菜单
const { COLORS, GAME_WIDTH, GAME_HEIGHT } = require('../utils/constants');

class MainMenu {
  constructor(uiManager) {
    this.ui = uiManager;
    this.buttons = [];
    this._createButtons();
  }

  _createButtons() {
    const w = GAME_WIDTH;
    this.buttons = [
      { text: '开始游戏', x: w / 2 - 80, y: 200, width: 160, height: 50, action: 'startGame' },
      { text: '关卡选择', x: w / 2 - 80, y: 270, width: 160, height: 50, action: 'levelSelect' },
      { text: '成长图鉴', x: w / 2 - 80, y: 340, width: 160, height: 50, action: 'gallery' },
      { text: '音效设置', x: w / 2 - 80, y: 410, width: 160, height: 50, action: 'settings' },
    ];
  }

  show() {
    this._createButtons();
  }

  handleClick(x, y) {
    for (const btn of this.buttons) {
      if (this._isPointInRect(x, y, btn)) {
        this.ui.game?.audio?.playUIClick?.();
        switch (btn.action) {
          case 'startGame':
            const currentLevel = this.ui.game?.progress?.getLevel?.() || 1;
            this.ui.game?.enterLevel?.(currentLevel);
            break;
          case 'levelSelect':
            this.ui.showLevelSelect();
            break;
          case 'gallery':
            this.ui.showGallery();
            break;
          case 'settings':
            this._toggleSound();
            break;
        }
        return true;
      }
    }
    return false;
  }

  _toggleSound() {
    const audio = this.ui.game?.audio;
    if (audio?.toggleMute) {
      audio.toggleMute();
    }
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

    // 标题
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('人生拾光', w / 2, 100);

    // 按钮
    for (const btn of this.buttons) {
      ctx.fillStyle = COLORS.PRIMARY;
      this._roundRect(ctx, btn.x, btn.y, btn.width, btn.height, 12);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText(btn.text, btn.x + btn.width / 2, btn.y + btn.height / 2 + 5);
    }

    // 底部标语
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    ctx.fillText('每一步成长，都值得被珍藏', w / 2, h - 50);
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

module.exports = MainMenu;
