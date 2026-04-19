// 匹配判定与消除引擎
const { Board } = require('../models/Board');
const Tile = require('./Tile');
const { TweenManager } = require('../utils/tween');

class MatchEngine {
  constructor() {
    this.board = null;
    this.tweens = new TweenManager();
    this.isProcessing = false;
    this.onMatchComplete = null;
    this.onTileMove = null;
  }

  // 初始化
  init() {
    this.board = new Board();
    this.board.init();
    this.isProcessing = false;
  }

  // 获取棋盘
  getBoard() {
    return this.board;
  }

  // 玩家交换碎片
  async swap(tile1, tile2) {
    if (this.isProcessing) return false;
    if (!tile1 || !tile2) return false;

    this.isProcessing = true;

    // 执行交换
    this.board.swap(tile1.row, tile1.col, tile2.row, tile2.col);

    // 等待动画完成
    await this._waitForAnimations();

    // 检查是否有匹配
    const matches = this.board.findMatches();
    if (matches.length === 0) {
      // 无匹配，交换回来
      this.board.swap(tile1.row, tile1.col, tile2.row, tile2.col);
      await this._waitForAnimations();
      this.isProcessing = false;
      return false;
    }

    // 处理匹配
    await this._processMatches();

    this.isProcessing = false;
    return true;
  }

  // 处理匹配流程
  async _processMatches() {
    let matches = this.board.findMatches();

    while (matches.length > 0) {
      // 标记所有匹配的碎片
      this.board.markMatches(matches);

      // 触发匹配完成回调
      if (this.onMatchComplete) {
        this.onMatchComplete(matches);
      }

      // 等待消除动画
      await this._waitForAnimations();

      // 移除匹配的碎片
      this.board.removeMatches();

      // 下落填补
      const drops = this.board.dropTiles();
      if (this.onTileMove) {
        this.onTileMove(drops);
      }

      this.board.fillEmpty();

      // 等待下落动画
      await this._waitForAnimations();

      // 检查新匹配（连消）
      matches = this.board.findMatches();
    }

    // 检查是否还有可移动的匹配
    if (!this.board.hasPossibleMoves()) {
      this.board.init();
      this.board.fillInitial();
    }
  }

  // 等待动画完成
  _waitForAnimations() {
    return new Promise(resolve => setTimeout(resolve, 200));
  }

  // 更新动画
  update() {
    this.tweens.update();
  }
}

module.exports = MatchEngine;
