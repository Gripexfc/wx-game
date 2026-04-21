/**
 * Banner 广告管理器（单例）
 * 在 HomePage 和 TaskPage 渲染时调用 show()，切换页面时调用 hide()
 */

let _instance = null;

class BannerAdManager {
  constructor() {
    this._ad = null;
    this._visible = false;
    this._adUnitId = null;
  }

  /** 获取单例 */
  static getInstance() {
    if (!_instance) {
      _instance = new BannerAdManager();
    }
    return _instance;
  }

  /** 初始化（占位 ID 不加载，避免开发者工具报错） */
  init(adUnitId) {
    if (!adUnitId || String(adUnitId).includes('YOUR_') || String(adUnitId).includes('PLACEHOLDER')) {
      return;
    }
    this._adUnitId = adUnitId;
    this._create();
  }

  _create() {
    if (typeof wx === 'undefined' || !wx.createBannerAd) return;

    try {
      this._ad = wx.createBannerAd({
        adUnitId: this._adUnitId,
        style: {
          left: 0,
          top: 0,
          width: 320,
        },
      });

      this._ad.onError((err) => {
        console.warn('Banner ad error:', err);
        this._hideReal();
      });

      this._ad.onResize((res) => {
        if (this._ad && this._ad.style) {
          const sys = wx.getSystemInfoSync();
          this._ad.style.top = sys.windowHeight - this._ad.style.height;
        }
      });

      this._ad.onLoad(() => {
        console.log('Banner ad loaded');
      });
    } catch (e) {
      console.warn('Banner ad create failed:', e);
      this._ad = null;
    }
  }

  /** 显示 Banner */
  show() {
    if (!this._ad) return;
    this._visible = true;
    this._ad.show().catch(() => {
      this._visible = false;
    });
  }

  /** 隐藏 Banner */
  hide() {
    this._visible = false;
    this._hideReal();
  }

  _hideReal() {
    if (!this._ad) return;
    try {
      this._ad.hide();
    } catch (e) {
      // ignore
    }
  }
}

module.exports = BannerAdManager;
