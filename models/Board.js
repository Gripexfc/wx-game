// 棋盘逻辑 - 6×6 时光碎片棋盘
const { BOARD_SIZE, TILE_TYPES, TILE_TYPE_KEYS } = require('../utils/constants');
const { randomPick } = require('../utils/helpers');

class Tile {
  constructor(type, row, col) {
    this.type = type;
    this.row = row;
    this.col = col;
    this.value = TILE_TYPES[type];
    this.matched = false;
    this.x = col;
    this.y = row;
  }
}

class Board {
  constructor() {
    this.grid = [];
    this.size = BOARD_SIZE;
    this.init();
  }

  init() {
    // 初始化空棋盘
    this.grid = [];
    for (let row = 0; row < this.size; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.size; col++) {
        this.grid[row][col] = null;
      }
    }
  }

  // 生成随机碎片
  randomTile(row, col) {
    const type = randomPick(TILE_TYPE_KEYS);
    return new Tile(type, row, col);
  }

  // 填充初始棋盘（不产生初始匹配）
  fillInitial() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        let tile;
        do {
          tile = this.randomTile(row, col);
        } while (this.wouldMatch(row, col, tile.type));
        this.grid[row][col] = tile;
      }
    }
  }

  // 检查放置某类型碎片是否会产生匹配
  wouldMatch(row, col, type) {
    // 检查横向
    if (col >= 2) {
      const left1 = this.grid[row][col - 1];
      const left2 = this.grid[row][col - 2];
      if (left1 && left2 && left1.type === type && left2.type === type) {
        return true;
      }
    }
    // 检查纵向
    if (row >= 2) {
      const up1 = this.grid[row - 1][col];
      const up2 = this.grid[row - 2][col];
      if (up1 && up2 && up1.type === type && up2.type === type) {
        return true;
      }
    }
    return false;
  }

  // 交换两个碎片
  swap(row1, col1, row2, col2) {
    const tile1 = this.grid[row1][col1];
    const tile2 = this.grid[row2][col2];
    if (!tile1 || !tile2) return false;

    // 检查是否相邻
    const dr = Math.abs(row1 - row2);
    const dc = Math.abs(col1 - col2);
    if (dr + dc !== 1) return false;

    // 交换位置
    this.grid[row1][col1] = tile2;
    this.grid[row2][col2] = tile1;
    tile1.row = row2;
    tile1.col = col2;
    tile2.row = row1;
    tile2.col = col1;

    return true;
  }

  // 查找所有匹配组
  findMatches() {
    const matches = [];
    const visited = Array(this.size).fill(null).map(() =>
      Array(this.size).fill(false)
    );

    // 横向匹配
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size - 2; col++) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        const match = [tile];
        let c = col + 1;
        while (c < this.size && this.grid[row][c] && this.grid[row][c].type === tile.type) {
          match.push(this.grid[row][c]);
          c++;
        }
        if (match.length >= 3) {
          matches.push(match);
          match.forEach(t => visited[row][t.col] = true);
        }
      }
    }

    // 纵向匹配
    for (let col = 0; col < this.size; col++) {
      for (let row = 0; row < this.size - 2; row++) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        const match = [tile];
        let r = row + 1;
        while (r < this.size && this.grid[r][col] && this.grid[r][col].type === tile.type) {
          match.push(this.grid[r][col]);
          r++;
        }
        if (match.length >= 3) {
          matches.push(match);
          match.forEach(t => visited[t.row][col] = true);
        }
      }
    }

    return matches;
  }

  // 标记匹配的碎片
  markMatches(matches) {
    matches.forEach(match => {
      match.forEach(tile => {
        tile.matched = true;
      });
    });
  }

  // 消除匹配的碎片
  removeMatches() {
    let count = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] && this.grid[row][col].matched) {
          this.grid[row][col] = null;
          count++;
        }
      }
    }
    return count;
  }

  // 碎片下落填充空白
  dropTiles() {
    const movements = [];
    for (let col = 0; col < this.size; col++) {
      let writeRow = this.size - 1;
      for (let row = this.size - 1; row >= 0; row--) {
        if (this.grid[row][col]) {
          if (row !== writeRow) {
            const tile = this.grid[row][col];
            this.grid[writeRow][col] = tile;
            this.grid[row][col] = null;
            tile.row = writeRow;
            movements.push({
              tile,
              fromRow: row,
              toRow: writeRow,
              col
            });
          }
          writeRow--;
        }
      }
    }
    return movements;
  }

  // 填充新的碎片到空白处
  fillEmpty() {
    const newTiles = [];
    for (let col = 0; col < this.size; col++) {
      for (let row = 0; row < this.size; row++) {
        if (!this.grid[row][col]) {
          const tile = this.randomTile(row, col);
          this.grid[row][col] = tile;
          newTiles.push(tile);
        }
      }
    }
    return newTiles;
  }

  // 获取指定位置碎片
  getTile(row, col) {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      return null;
    }
    return this.grid[row][col];
  }

  // 检查是否有可用的移动
  hasPossibleMoves() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        // 尝试向右交换
        if (col < this.size - 1) {
          this.swap(row, col, row, col + 1);
          const hasMatch = this.findMatches().length > 0;
          this.swap(row, col, row, col + 1); // 换回来
          if (hasMatch) return true;
        }
        // 尝试向下交换
        if (row < this.size - 1) {
          this.swap(row, col, row + 1, col);
          const hasMatch = this.findMatches().length > 0;
          this.swap(row, col, row + 1, col); // 换回来
          if (hasMatch) return true;
        }
      }
    }
    return false;
  }

  // 获取所有碎片类型统计
  getTileStats() {
    const stats = {};
    TILE_TYPE_KEYS.forEach(key => stats[key] = 0);
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const tile = this.grid[row][col];
        if (tile) {
          stats[tile.type]++;
        }
      }
    }
    return stats;
  }
}

module.exports = { Board, Tile };
