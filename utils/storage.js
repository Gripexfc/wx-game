// 本地存储 key 常量
const STORAGE_KEYS = {
  PROGRESS: 'life_gathering_progress',
  FRAGMENTS: 'life_gathering_fragments',
  ACHIEVEMENTS: 'life_gathering_achievements',
  SETTINGS: 'life_gathering_settings',
};

class Storage {
  constructor() {
    this.cache = {};
  }

  set(key, value) {
    const jsonStr = JSON.stringify(value);
    try {
      wx.setStorageSync(key, jsonStr);
      this.cache[key] = value;
    } catch (e) {
      console.error('Storage set error:', e);
    }
  }

  get(key, defaultValue = null) {
    if (this.cache[key] !== undefined) {
      return this.cache[key];
    }
    try {
      const value = wx.getStorageSync(key);
      if (value) {
        const parsed = JSON.parse(value);
        this.cache[key] = parsed;
        return parsed;
      }
    } catch (e) {
      console.error('Storage get error:', e);
    }
    return defaultValue;
  }

  remove(key) {
    try {
      wx.removeStorageSync(key);
      delete this.cache[key];
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  }

  clear() {
    try {
      wx.clearStorageSync();
      this.cache = {};
    } catch (e) {
      console.error('Storage clear error:', e);
    }
  }
}

module.exports = { Storage, STORAGE_KEYS };
