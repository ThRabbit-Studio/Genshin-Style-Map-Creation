/* 噪声与随机工具（全局命名空间 GMM） */
window.GMM = window.GMM || {};
(function (N) {
  "use strict";

  function hsh(x, y) {
    var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /* 值噪声，五次淡入 + fbm 时旋转破坏网格对齐 */
  function vn(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    var v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    var a = hsh(xi, yi), b = hsh(xi + 1, yi), c = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, oct) {
    var s = 0, amp = 1, tot = 0, nx, ny, c = 0.8, sn = 0.6;
    for (var i = 0; i < oct; i++) {
      s += vn(x, y) * amp;
      tot += amp;
      amp *= 0.5;
      nx = x * 2.02 + 13.7;
      ny = y * 2.02 + 7.3;
      x = nx * c - ny * sn + 31.4;
      y = nx * sn + ny * c - 17.7;
    }
    return s / tot;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  N.hsh = hsh;
  N.vn = vn;
  N.fbm = fbm;
  N.mulberry32 = mulberry32;
  N.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
})(window.GMM);
