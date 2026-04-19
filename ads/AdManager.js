// 广告系统
const { Storage, STORAGE_KEYS } = require('../utils/storage');

// 广告类型
const AD_TYPES = {
  REWARDED_VIDEO: 'rewarded_video',
  INTERSTITIAL: 'interstitial',
  BANNER: 'banner',
};

// 激励视频广告状态
const AD_STATES = {
  NOT_LOADED: 'not_loaded',
  LOADING: 'loading',
  LOADED: 'loaded',
  PLAYING: 'playing',
  CLOSED: 'closed',
  ERROR: 'error',
};

class AdManager {
  constructor() {
    this.storage = new Storage();
    this.ads = {};
    this.adStates = {
      [AD_TYPES.REWARDED_VIDEO]: AD_STATES.NOT_LOADED,
      [AD_TYPES.INTERSTITIAL]: AD_STATES.NOT_LOADED,
    };
    this.rewardedVideoCallbacks = null;
    this.loadSettings();
  }

  loadSettings() {
    const settings = this.storage.get(STORAGE_KEYS.SETTINGS);
    if (settings) {
      this.adsEnabled = settings.adsEnabled !== false; // 默认开启
    } else {
      this.adsEnabled = true;
    }
  }

  saveSettings() {
    let settings = this.storage.get(STORAGE_KEYS.SETTINGS) || {};
    settings = { ...settings, adsEnabled: this.adsEnabled };
    this.storage.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // 是否启用广告
  isAdsEnabled() {
    return this.adsEnabled;
  }

  // 设置广告启用状态
  setAdsEnabled(enabled) {
    this.adsEnabled = enabled;
    this.saveSettings();
  }

  // 预加载激励视频广告
  loadRewardedVideoAd(adUnitId) {
    if (!this.adsEnabled) return;

    this.adStates[AD_TYPES.REWARDED_VIDEO] = AD_STATES.LOADING;

    try {
      const ad = wx.createRewardedVideoAd({
        adUnitId: adUnitId || 'YOUR_REWARDED_VIDEO_AD_UNIT_ID',
      });

      ad.onLoad(() => {
        this.adStates[AD_TYPES.REWARDED_VIDEO] = AD_STATES.LOADED;
        console.log('Rewarded video ad loaded');
      });

      ad.onError((err) => {
        this.adStates[AD_TYPES.REWARDED_VIDEO] = AD_STATES.ERROR;
        console.error('Rewarded video ad error:', err);
      });

      ad.onClose((res) => {
        this.adStates[AD_TYPES.REWARDED_VIDEO] = AD_STATES.CLOSED;
        if (res && res.isEnded) {
          // 用户完整观看，给予奖励
          if (this.rewardedVideoCallbacks && this.rewardedVideoCallbacks.onReward) {
            this.rewardedVideoCallbacks.onReward();
          }
        }
        // 关闭回调
        if (this.rewardedVideoCallbacks && this.rewardedVideoCallbacks.onClose) {
          this.rewardedVideoCallbacks.onClose(res);
        }
        this.rewardedVideoCallbacks = null;
      });

      this.ads[AD_TYPES.REWARDED_VIDEO] = ad;
    } catch (err) {
      console.error('Failed to create rewarded video ad:', err);
      this.adStates[AD_TYPES.REWARDED_VIDEO] = AD_STATES.ERROR;
    }
  }

  // 显示激励视频广告
  showRewardedVideoAd(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.adsEnabled) {
        reject(new Error('Ads disabled'));
        return;
      }

      const ad = this.ads[AD_TYPES.REWARDED_VIDEO];
      if (!ad) {
        reject(new Error('Rewarded video ad not loaded'));
        return;
      }

      this.rewardedVideoCallbacks = {
        onReward: options.onReward || (() => {}),
        onClose: options.onClose || (() => {}),
        onError: options.onError || (() => {}),
      };

      ad.show()
        .then(() => {
          this.adStates[AD_TYPES.REWARDED_VIDEO] = AD_STATES.PLAYING;
          resolve();
        })
        .catch((err) => {
          this.adStates[AD_TYPES.REWARDED_VIDEO] = AD_STATES.ERROR;
          if (this.rewardedVideoCallbacks.onError) {
            this.rewardedVideoCallbacks.onError(err);
          }
          this.rewardedVideoCallbacks = null;
          reject(err);
        });
    });
  }

  // 预加载插屏广告
  loadInterstitialAd(adUnitId) {
    if (!this.adsEnabled) return;

    this.adStates[AD_TYPES.INTERSTITIAL] = AD_STATES.LOADING;

    try {
      const ad = wx.createInterstitialAd({
        adUnitId: adUnitId || 'YOUR_INTERSTITIAL_AD_UNIT_ID',
      });

      ad.onLoad(() => {
        this.adStates[AD_TYPES.INTERSTITIAL] = AD_STATES.LOADED;
        console.log('Interstitial ad loaded');
      });

      ad.onError((err) => {
        this.adStates[AD_TYPES.INTERSTITIAL] = AD_STATES.ERROR;
        console.error('Interstitial ad error:', err);
      });

      ad.onClose(() => {
        this.adStates[AD_TYPES.INTERSTITIAL] = AD_STATES.CLOSED;
      });

      this.ads[AD_TYPES.INTERSTITIAL] = ad;
    } catch (err) {
      console.error('Failed to create interstitial ad:', err);
      this.adStates[AD_TYPES.INTERSTITIAL] = AD_STATES.ERROR;
    }
  }

  // 显示插屏广告
  showInterstitialAd() {
    return new Promise((resolve, reject) => {
      if (!this.adsEnabled) {
        reject(new Error('Ads disabled'));
        return;
      }

      const ad = this.ads[AD_TYPES.INTERSTITIAL];
      if (!ad) {
        reject(new Error('Interstitial ad not loaded'));
        return;
      }

      try {
        ad.show()
          .then(() => {
            this.adStates[AD_TYPES.INTERSTITIAL] = AD_STATES.PLAYING;
            resolve();
          })
          .catch((err) => {
            this.adStates[AD_TYPES.INTERSTITIAL] = AD_STATES.ERROR;
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
  }

  // 获取广告状态
  getAdState(type) {
    return this.adStates[type] || AD_STATES.NOT_LOADED;
  }

  // 激励视频广告是否已加载
  isRewardedVideoLoaded() {
    return this.adStates[AD_TYPES.REWARDED_VIDEO] === AD_STATES.LOADED;
  }

  // 插屏广告是否已加载
  isInterstitialLoaded() {
    return this.adStates[AD_TYPES.INTERSTITIAL] === AD_STATES.LOADED;
  }

  // 初始化所有广告（占位 ID 不加载，避免开发者工具里无意义报错）
  init(rewardedVideoAdUnitId, interstitialAdUnitId) {
    const isPlaceholder = (id) =>
      !id ||
      String(id).includes('YOUR_') ||
      String(id).includes('PLACEHOLDER');

    if (!isPlaceholder(rewardedVideoAdUnitId)) {
      this.loadRewardedVideoAd(rewardedVideoAdUnitId);
    }
    if (!isPlaceholder(interstitialAdUnitId)) {
      this.loadInterstitialAd(interstitialAdUnitId);
    }
  }

  // 销毁广告
  destroy() {
    Object.values(this.ads).forEach(ad => {
      if (ad && ad.destroy) {
        ad.destroy();
      }
    });
    this.ads = {};
    this.rewardedVideoCallbacks = null;
  }
}

module.exports = {
  AdManager,
  AD_TYPES,
  AD_STATES,
};
