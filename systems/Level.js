// 关卡系统
const { LEVEL_STAGES } = require('../utils/constants');

class LevelSystem {
  constructor() {
    this.currentLevel = 1;
    this.levelConfig = null;
  }

  loadLevel(levelId) {
    this.currentLevel = levelId;
    try {
      this.levelConfig = require(`../levels/level_${levelId}.json`);
    } catch (e) {
      // 默认配置
      this.levelConfig = this._getDefaultConfig(levelId);
    }
    return this.levelConfig;
  }

  _getDefaultConfig(levelId) {
    const baseScore = 1000 + (levelId - 1) * 500;
    const moves = 20 + Math.floor(levelId / 2);
    return {
      id: levelId,
      name: `关卡 ${levelId}`,
      targetScore: baseScore,
      maxMoves: moves,
      requiredTypes: ['green', 'orange', 'blue', 'pink', 'gold'].slice(0, 3 + Math.floor(levelId / 4)),
      collectFragment: this._getFragmentType(levelId),
    };
  }

  _getFragmentType(levelId) {
    const types = ['green', 'orange', 'blue', 'pink', 'gold'];
    return types[Math.floor((levelId - 1) / 3) % types.length];
  }

  getTargetScore() {
    return this.levelConfig?.targetScore || 1000;
  }

  getMaxMoves() {
    return this.levelConfig?.maxMoves || 20;
  }

  getRequiredTypes() {
    return this.levelConfig?.requiredTypes || ['green', 'orange', 'blue'];
  }

  getCollectFragment() {
    return this.levelConfig?.collectFragment || 'green';
  }

  getStage() {
    for (const stage of Object.values(LEVEL_STAGES)) {
      if (stage.levels.includes(this.currentLevel)) {
        return stage;
      }
    }
    return null;
  }

  getLevelName() {
    return this.levelConfig?.name || `关卡 ${this.currentLevel}`;
  }

  getDescription() {
    return this.levelConfig?.description || '';
  }
}

module.exports = LevelSystem;
