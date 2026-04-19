// 微信小游戏适配层 - 将微信 API 适配为标准游戏接口
// 此模块封装微信 API，提供统一的游戏开发接口

const wxAdapter = {
  // 版本信息
  version: '1.0.0',
  platform: 'wechat',

  // 替代浏览器 requestAnimationFrame
  requestAnimationFrame: (callback) => {
    if (typeof wx !== 'undefined' && typeof wx.requestAnimationFrame === 'function') {
      return wx.requestAnimationFrame(callback);
    }
    if (typeof requestAnimationFrame === 'function') {
      return requestAnimationFrame(callback);
    }
    return setTimeout(callback, 16);
  },

  // 触摸事件
  onTouchStart: (callback) => {
    wx.onTouchStart(callback);
  },
  onTouchMove: (callback) => {
    wx.onTouchMove(callback);
  },
  onTouchEnd: (callback) => {
    wx.onTouchEnd(callback);
  },
  offTouchStart: (callback) => {
    if (callback) {
      wx.offTouchStart(callback);
    } else {
      wx.offTouchStart();
    }
  },
  offTouchMove: (callback) => {
    if (callback) {
      wx.offTouchMove(callback);
    } else {
      wx.offTouchMove();
    }
  },
  offTouchEnd: (callback) => {
    if (callback) {
      wx.offTouchEnd(callback);
    } else {
      wx.offTouchEnd();
    }
  },

  // 图像
  createImage: () => {
    return wx.createImage();
  },

  // 音频
  createInnerAudioContext: () => {
    return wx.createInnerAudioContext();
  },

  // 存储
  setStorage: (key, value) => {
    try {
      wx.setStorageSync(key, value);
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },
  getStorage: (key) => {
    try {
      return wx.getStorageSync(key);
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },
  removeStorage: (key) => {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  },
  clearStorage: () => {
    try {
      wx.clearStorageSync();
      return true;
    } catch (e) {
      console.error('Storage clear error:', e);
      return false;
    }
  },

  // 广告
  createRewardedVideoAd: (options) => {
    try {
      return wx.createRewardedVideoAd(options);
    } catch (e) {
      console.error('Create rewarded video ad error:', e);
      return null;
    }
  },
  createInterstitialAd: (options) => {
    try {
      return wx.createInterstitialAd(options);
    } catch (e) {
      console.error('Create interstitial ad error:', e);
      return null;
    }
  },

  // 系统信息
  getSystemInfo: () => {
    try {
      return wx.getSystemInfoSync();
    } catch (e) {
      console.error('Get system info error:', e);
      return null;
    }
  },

  // 屏幕亮度
  setScreenBrightness: (value) => {
    try {
      wx.setScreenBrightness({ brightness: value });
      return true;
    } catch (e) {
      console.error('Set screen brightness error:', e);
      return false;
    }
  },

  // 振动
  vibrateShort: () => {
    try {
      wx.vibrateShort();
      return true;
    } catch (e) {
      console.error('Vibrate short error:', e);
      return false;
    }
  },
  vibrateLong: () => {
    try {
      wx.vibrateLong();
      return true;
    } catch (e) {
      console.error('Vibrate long error:', e);
      return false;
    }
  },

  // 用户信息
  getUserInfo: () => {
    return new Promise((resolve, reject) => {
      wx.getUserInfo({
        success: resolve,
        fail: reject,
      });
    });
  },

  // 登录
  login: () => {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject,
      });
    });
  },

  // 分享
  updateShareMenu: (options) => {
    try {
      wx.updateShareMenu(options);
      return true;
    } catch (e) {
      console.error('Update share menu error:', e);
      return false;
    }
  },

  // 显示分享按钮
  showShareMenu: (options = {}) => {
    try {
      wx.showShareMenu(options);
      return true;
    } catch (e) {
      console.error('Show share menu error:', e);
      return false;
    }
  },

  // 激励广告相关
  loadRewardedVideoAd: (adUnitId) => {
    try {
      return wx.createRewardedVideoAd({ adUnitId });
    } catch (e) {
      console.error('Load rewarded video ad error:', e);
      return null;
    }
  },

  // 插屏广告相关
  loadInterstitialAd: (adUnitId) => {
    try {
      return wx.createInterstitialAd({ adUnitId });
    } catch (e) {
      console.error('Load interstitial ad error:', e);
      return null;
    }
  },

  // 错误处理
  onError: (callback) => {
    wx.onError(callback);
  },

  // 应用错误处理
  onAppError: (callback) => {
    wx.onAppError(callback);
  },

  // 生命周期
  onShow: (callback) => {
    wx.onShow(callback);
  },

  onHide: (callback) => {
    wx.onHide(callback);
  },

  offShow: (callback) => {
    if (callback) {
      wx.offShow(callback);
    } else {
      wx.offShow();
    }
  },

  offHide: (callback) => {
    if (callback) {
      wx.offHide(callback);
    } else {
      wx.offHide();
    }
  },

  // 调试日志
  log: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[WeChat Adapter]', ...args);
    }
  },

  // 获取适配器版本
  getVersion: () => {
    return wxAdapter.version;
  },

  // 检查是否在微信环境
  isWeChat: () => {
    return typeof wx !== 'undefined' && wx.request !== undefined;
  },
};

// 验证环境
if (!wxAdapter.isWeChat()) {
  console.error('Warning: Not running in WeChat environment');
}

module.exports = wxAdapter;
