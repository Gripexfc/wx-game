const { STORAGE_KEYS } = require('../utils/constants');

class Storage {
  constructor() {
    this.cache = {};
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

  set(key, value) {
    const jsonStr = JSON.stringify(value);
    try {
      wx.setStorageSync(key, jsonStr);
      this.cache[key] = value;
    } catch (e) {
      console.error('Storage set error:', e);
    }
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

module.exports = Storage;
