// 随机整数 [min, max]
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机从数组中取元素
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 延迟执行 Promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 计算两点距离
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 限制数值范围
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 线性插值
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 角度转弧度
function degToRad(deg) {
  return deg * Math.PI / 180;
}

module.exports = {
  randomInt, randomPick, delay, distance, clamp, lerp, degToRad,
};
