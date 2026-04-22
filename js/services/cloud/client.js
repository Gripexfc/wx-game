/**
 * 云开发统一入口：单函数 luluApi，action 路由。
 * 无 wx 或非小游戏环境时安全降级为失败提示（便于 Node 外跑通逻辑）。
 */
const FUNCTION_NAME = 'luluApi';

let _inited = false;

function _ensureInit() {
  if (_inited) return;
  if (typeof wx === 'undefined' || !wx.cloud) return;
  try {
    wx.cloud.init({ traceUser: true });
  } catch (e) {
    console.warn('[cloud] init', e);
  }
  _inited = true;
}

function isCloudAvailable() {
  _ensureInit();
  return typeof wx !== 'undefined' && wx.cloud && typeof wx.cloud.callFunction === 'function';
}

/**
 * @param {string} action
 * @param {object} [payload]
 * @returns {Promise<{ success: boolean, data?: *, idempotent?: boolean, code?: string, message?: string }>}
 */
function callAction(action, payload) {
  _ensureInit();
  if (!isCloudAvailable()) {
    return Promise.resolve({
      success: false,
      code: 'CLOUD_UNAVAILABLE',
      message: '云能力不可用（需真机/开发者工具开云开发）',
    });
  }
  return new Promise((resolve) => {
    wx.cloud.callFunction({
      name: FUNCTION_NAME,
      data: { action, payload: payload || {} },
      success: (res) => {
        const r = res && res.result;
        if (r && typeof r === 'object') resolve(r);
        else resolve({ success: false, code: 'INVALID_RESPONSE', message: '云函数返回异常' });
      },
      fail: (err) => {
        resolve({
          success: false,
          code: 'CALL_FAIL',
          message: (err && err.errMsg) || String(err),
        });
      },
    });
  });
}

/**
 * 成功时返回 data，失败抛带 code 的 Error
 */
function callActionOrThrow(action, payload) {
  return callAction(action, payload).then((r) => {
    if (r && r.success) return r;
    const code = (r && r.code) || 'UNKNOWN';
    const e = new Error((r && r.message) || code);
    e.code = code;
    e.result = r;
    throw e;
  });
}

module.exports = {
  FUNCTION_NAME,
  isCloudAvailable,
  callAction,
  callActionOrThrow,
};
