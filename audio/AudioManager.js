// 音效系统
const { Storage, STORAGE_KEYS } = require('../utils/storage');

// 音效类型
const SOUND_TYPES = {
  // UI 音效
  UI_CLICK: 'ui_click',
  UI_BACK: 'ui_back',
  UI_HOVER: 'ui_hover',

  // 游戏音效
  TILE_SWAP: 'tile_swap',
  TILE_MATCH: 'tile_match',
  TILE_ELIMINATE: 'tile_eliminate',
  TILE_DROP: 'tile_drop',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER: 'game_over',

  // 特殊音效
  ACHIEVEMENT_UNLOCK: 'achievement_unlock',
  BUTTON_TAP: 'button_tap',
};

// 背景音乐类型
const MUSIC_TYPES = {
  MENU: 'menu',
  LEVEL_1_3: 'level_1_3',    // 童年启蒙
  LEVEL_4_6: 'level_4_6',    // 成长突破
  LEVEL_7_9: 'level_7_9',    // 温情相守
  LEVEL_10_12: 'level_10_12', // 圆满收获
  RESULT: 'result',
};

class AudioManager {
  constructor() {
    this.storage = new Storage();
    this.loadSettings();

    this.effects = {};
    this.music = {};
    this.currentMusic = null;
    this.musicContext = null;

    this.init();
  }

  loadSettings() {
    const settings = this.storage.get(STORAGE_KEYS.SETTINGS);
    if (settings) {
      this.effectsVolume = settings.effectsVolume ?? 1.0;
      this.musicVolume = settings.musicVolume ?? 0.7;
      this.muted = settings.muted ?? false;
    } else {
      this.effectsVolume = 1.0;
      this.musicVolume = 0.7;
      this.muted = false;
    }
  }

  saveSettings() {
    let settings = this.storage.get(STORAGE_KEYS.SETTINGS) || {};
    settings = {
      ...settings,
      effectsVolume: this.effectsVolume,
      musicVolume: this.musicVolume,
      muted: this.muted,
    };
    this.storage.set(STORAGE_KEYS.SETTINGS, settings);
  }

  init() {
    // 预加载音效
    this.preloadEffects();
  }

  preloadEffects() {
    // 微信小游戏使用 createInnerAudioContext
    Object.values(SOUND_TYPES).forEach(type => {
      // 实际项目中会预加载音效文件
      // this.effects[type] = this.createEffect(type);
    });
  }

  createEffect(type) {
    const effect = wx.createInnerAudioContext();
    // 实际项目中会设置 src
    // effect.src = `assets/audio/${type}.mp3`;
    effect.volume = this.effectsVolume;
    return effect;
  }

  // 播放音效
  playEffect(type) {
    if (this.muted) return;

    const effect = this.effects[type];
    if (effect) {
      effect.stop();
      effect.play();
    }
  }

  // 播放 UI 点击音效
  playUIClick() {
    this.playEffect(SOUND_TYPES.UI_CLICK);
  }

  // 播放碎片交换音效
  playTileSwap() {
    this.playEffect(SOUND_TYPES.TILE_SWAP);
  }

  // 播放匹配音效
  playTileMatch() {
    this.playEffect(SOUND_TYPES.TILE_MATCH);
  }

  // 播放消除音效
  playTileEliminate() {
    this.playEffect(SOUND_TYPES.TILE_ELIMINATE);
  }

  // 播放碎片下落音效
  playTileDrop() {
    this.playEffect(SOUND_TYPES.TILE_DROP);
  }

  // 播放关卡完成音效
  playLevelComplete() {
    this.playEffect(SOUND_TYPES.LEVEL_COMPLETE);
  }

  // 播放游戏结束音效
  playGameOver() {
    this.playEffect(SOUND_TYPES.GAME_OVER);
  }

  // 播放成就解锁音效
  playAchievementUnlock() {
    this.playEffect(SOUND_TYPES.ACHIEVEMENT_UNLOCK);
  }

  // 播放背景音乐
  playMusic(type) {
    if (this.muted) return;

    if (this.currentMusic === type) return;

    this.stopMusic();

    const music = wx.createInnerAudioContext();
    // 实际项目中会设置 src
    // music.src = `assets/audio/music/${type}.mp3`;
    music.volume = this.musicVolume;
    music.loop = true;
    music.play();

    this.musicContext = music;
    this.currentMusic = type;
  }

  // 停止背景音乐
  stopMusic() {
    if (this.musicContext) {
      this.musicContext.stop();
      this.musicContext = null;
    }
    this.currentMusic = null;
  }

  // 暂停背景音乐
  pauseMusic() {
    if (this.musicContext) {
      this.musicContext.pause();
    }
  }

  // 恢复背景音乐
  resumeMusic() {
    if (this.musicContext) {
      this.musicContext.play();
    }
  }

  // 根据关卡播放对应背景音乐
  playLevelMusic(level) {
    let type;
    if (level >= 1 && level <= 3) {
      type = MUSIC_TYPES.LEVEL_1_3;
    } else if (level >= 4 && level <= 6) {
      type = MUSIC_TYPES.LEVEL_4_6;
    } else if (level >= 7 && level <= 9) {
      type = MUSIC_TYPES.LEVEL_7_9;
    } else {
      type = MUSIC_TYPES.LEVEL_10_12;
    }
    this.playMusic(type);
  }

  // 播放菜单音乐
  playMenuMusic() {
    this.playMusic(MUSIC_TYPES.MENU);
  }

  // 播放结果页音乐
  playResultMusic() {
    this.playMusic(MUSIC_TYPES.RESULT);
  }

  // 设置音效音量
  setEffectsVolume(volume) {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();

    // 更新已加载音效的音量
    Object.values(this.effects).forEach(effect => {
      if (effect) {
        effect.volume = this.effectsVolume;
      }
    });
  }

  // 设置音乐音量
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();

    if (this.musicContext) {
      this.musicContext.volume = this.musicVolume;
    }
  }

  // 获取音效音量
  getEffectsVolume() {
    return this.effectsVolume;
  }

  // 获取音乐音量
  getMusicVolume() {
    return this.musicVolume;
  }

  // 静音/取消静音
  toggleMute() {
    this.muted = !this.muted;
    this.saveSettings();

    if (this.muted) {
      this.stopMusic();
    } else if (this.currentMusic) {
      this.resumeMusic();
    }

    return this.muted;
  }

  // 是否静音
  isMuted() {
    return this.muted;
  }

  // 获取当前设置
  getSettings() {
    return {
      effectsVolume: this.effectsVolume,
      musicVolume: this.musicVolume,
      muted: this.muted,
    };
  }

  // 销毁
  destroy() {
    this.stopMusic();
    Object.values(this.effects).forEach(effect => {
      if (effect) {
        effect.destroy();
      }
    });
    this.effects = {};
  }
}

module.exports = {
  AudioManager,
  SOUND_TYPES,
  MUSIC_TYPES,
};
