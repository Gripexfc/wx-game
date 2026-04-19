// 碎片数据模型
const { TILE_TYPE_KEYS, TILE_TYPES, TILE_SIZE, TILE_GAP } = require('../utils/constants');
const { randomPick } = require('../utils/helpers');

class Tile {
  constructor(type, row, col) {
    this.type = type || randomPick(TILE_TYPE_KEYS);
    this.row = row;
    this.col = col;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.scale = 1;
    this.alpha = 1;
    this.rotation = 0;
    this.isMatched = false;
    this.isNew = false;

    // 初始化位置
    this.resetPosition();
  }

  // 重置位置
  resetPosition() {
    this.x = this.col * (TILE_SIZE + TILE_GAP);
    this.y = this.row * (TILE_SIZE + TILE_GAP);
    this.targetX = this.x;
    this.targetY = this.y;
  }

  // 获取颜色
  getColor() {
    return TILE_TYPES[this.type]?.color || '#CCCCCC';
  }

  // 获取名称
  getName() {
    return TILE_TYPES[this.type]?.name || '未知';
  }

  // 是否可消除（相同类型）
  canMatchWith(other) {
    return other && this.type === other.type;
  }

  // 设置目标位置
  setTarget(row, col) {
    this.targetX = col * (TILE_SIZE + TILE_GAP);
    this.targetY = row * (TILE_SIZE + TILE_GAP);
  }

  // 更新位置（用于动画）
  updatePosition(progress) {
    this.x = this.x + (this.targetX - this.x) * progress;
    this.y = this.y + (this.targetY - this.y) * progress;
  }

  // 是否到达目标位置
  isAtTarget() {
    return Math.abs(this.x - this.targetX) < 0.5 && Math.abs(this.y - this.targetY) < 0.5;
  }
}

module.exports = Tile;
