// 游戏主视图（棋盘渲染）
const { COLORS, BOARD_SIZE, TILE_SIZE, TILE_GAP, GAME_WIDTH, TILE_TYPES } = require('../utils/constants');

class GameView {
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

  render(ctx) {
    if (!this.visible) return;

    const board = this.ui.game?.engine?.board;
    if (!board) return;

    const w = ctx.canvas?.width || GAME_WIDTH;
    const offset = this._getBoardOffset(w);

    // 棋盘背景
    const boardW = BOARD_SIZE * (TILE_SIZE + TILE_GAP);
    const boardH = BOARD_SIZE * (TILE_SIZE + TILE_GAP);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this._roundRect(ctx, offset.x - 10, offset.y - 10, boardW + 20, boardH + 20, 16);
    ctx.fill();

    // 绘制碎片
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = board.getTile(row, col);
        if (tile && !tile.matched) {
          this._drawTile(ctx, tile, offset);
        }
      }
    }
  }

  _getBoardOffset(w) {
    const boardWidth = BOARD_SIZE * (TILE_SIZE + TILE_GAP);
    return {
      x: (w - boardWidth) / 2,
      y: 120,
    };
  }

  _drawTile(ctx, tile, offset) {
    const x = offset.x + tile.col * (TILE_SIZE + TILE_GAP);
    const y = offset.y + tile.row * (TILE_SIZE + TILE_GAP);
    const color = TILE_TYPES[tile.type]?.color || '#CCCCCC';
    const radius = TILE_SIZE / 2 - 2;

    // 碎片圆形背景
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // 高光效果
    const gradient = ctx.createRadialGradient(
      x + TILE_SIZE / 2 - 5, y + TILE_SIZE / 2 - 5, 0,
      x + TILE_SIZE / 2, y + TILE_SIZE / 2, radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, radius, 0, Math.PI * 2);
    ctx.fill();
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

  // 获取棋盘偏移量
  getBoardOffset(w) {
    return this._getBoardOffset(w || GAME_WIDTH);
  }

  update() {}
}

module.exports = GameView;
