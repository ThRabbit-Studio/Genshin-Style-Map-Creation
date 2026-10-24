/* 装饰物图元库：原神风格 2.5D 手绘拼贴图元（GMM.Decor）
   全部由矩形/三角/梯形/圆/椭圆/线段/多边形拼贴而成，纯色填充 + 统一细描边。
   约定：光源在左上；地面基准线 y≈12，图形向上生长，最高 y≈-46；
   屋顶占建筑主体（明暗两个坡面 + 脊线高光），墙体是屋顶下的窄条奶油色。 */
window.GMM = window.GMM || {};
(function (D) {
  "use strict";

  function tri(c, x1, y1, x2, y2, x3, y3) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); }
  function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.283); }

  /* 地面偏移投影：光源左上，投影椭圆偏向右下 (3,10) */
  function sh(c, rx) { c.fillStyle = 'rgba(25,28,20,0.25)'; c.beginPath(); c.ellipse(3, 10, rx, rx * 0.36, 0, 0, 6.283); c.fill(); }
  /* 统一细描边 */
  function ink(c) { c.strokeStyle = '#4a3a26'; c.lineWidth = 2; c.lineJoin = 'round'; c.lineCap = 'round'; }
  /* 更细一级描边（小部件/裂缝/帆） */
  function fine(c) { c.lineWidth = 1.5; }

  /* 双坡屋顶：暗色后坡 + 亮色前坡 + 脊线高光（前坡受左上光） */
  function hipped(c, cx, ye, we, yr, wr, yt, wt, light, dark) {
    c.fillStyle = dark; poly(c, [[cx - wr, yr], [cx + wr, yr], [cx + wt, yt], [cx - wt, yt]]); c.fill(); c.stroke();
    c.fillStyle = light; poly(c, [[cx - we, ye], [cx + we, ye], [cx + wr, yr], [cx - wr, yr]]); c.fill(); c.stroke();
    c.strokeStyle = '#f5efdc'; fine(c);
    c.beginPath(); c.moveTo(cx - wr, yr); c.lineTo(cx + wr, yr); c.stroke();
    ink(c);
  }

  /* 锥顶/山墙顶：左亮右暗两块三角拼合 */
  function cone2(c, x1, yb, x2, xa, ya, light, dark) {
    var xm = (x1 + x2) / 2;
    c.fillStyle = light; tri(c, x1, yb, xa, ya, xm, yb); c.fill(); c.stroke();
    c.fillStyle = dark; tri(c, xa, ya, x2, yb, xm, yb); c.fill(); c.stroke();
  }

  D.DEFS = {
    house: { name: '民居', cat: '建筑', hit: 22, draw: function (c) {
      sh(c, 20); ink(c);
      c.fillStyle = '#f2e8d2'; rr(c, -11, -2, 22, 14, 2); c.fill(); c.stroke();
      c.fillStyle = '#e0b25e'; fine(c);
      rr(c, -9, 0, 5, 5, 1); c.fill(); c.stroke(); rr(c, 4, 0, 5, 5, 1); c.fill(); c.stroke();
      c.fillStyle = '#5f4028'; rr(c, -3, 4, 6, 8, 1); c.fill(); c.stroke();
      hipped(c, 0, -2, 16, -15, 11, -23, 7, '#c05a3e', '#96412e');
    }},
    tavern: { name: '大屋', cat: '建筑', hit: 27, draw: function (c) {
      sh(c, 25); ink(c);
      c.fillStyle = '#8a5f3c'; rr(c, 11, -32, 6, 15, 1); c.fill(); c.stroke();
      c.fillStyle = '#f2e8d2'; rr(c, -16, -3, 32, 15, 2); c.fill(); c.stroke();
      c.strokeStyle = '#8a5f3c'; fine(c);
      c.beginPath(); c.moveTo(-13, 0); c.lineTo(13, 0); c.moveTo(-13, 6); c.lineTo(13, 6); c.stroke();
      ink(c);
      c.fillStyle = '#e0b25e'; fine(c);
      rr(c, -13, 1, 5, 5, 1); c.fill(); c.stroke(); rr(c, 8, 1, 5, 5, 1); c.fill(); c.stroke();
      c.fillStyle = '#5f4028'; rr(c, -4, 4, 8, 8, 1); c.fill(); c.stroke();
      hipped(c, 0, -3, 22, -19, 13, -28, 9, '#c05a3e', '#96412e');
    }},
    cathedral: { name: '教堂', cat: '建筑', hit: 27, draw: function (c) {
      sh(c, 22); ink(c);
      c.fillStyle = '#f2e8d2'; rr(c, -13, 0, 26, 12, 2); c.fill(); c.stroke();
      c.fillStyle = '#635a4c'; fine(c); rr(c, -2.5, 8, 5, 4, 1.5); c.fill(); c.stroke();
      c.fillStyle = '#e0b25e'; dot(c, 0, 3.5, 3); c.fill(); c.stroke();
      c.fillStyle = '#227f95';
      tri(c, -16, 0, -10, 0, -13, -9); c.fill(); c.stroke();
      tri(c, 10, 0, 16, 0, 13, -9); c.fill(); c.stroke();
      ink(c);
      cone2(c, -12, 0, 12, 0, -32, '#3ab5c9', '#227f95');
      c.fillStyle = '#e0b25e'; fine(c); dot(c, 0, -33, 2.5); c.fill(); c.stroke();
    }},
    tower: { name: '哨塔', cat: '建筑', hit: 20, draw: function (c) {
      sh(c, 13); ink(c);
      c.fillStyle = '#f2e8d2'; rr(c, -8, -2, 16, 14, 2); c.fill(); c.stroke();
      c.fillStyle = '#e0b25e'; fine(c); rr(c, -2.5, 0, 5, 5, 1); c.fill(); c.stroke();
      c.fillStyle = '#5f4028'; rr(c, -3, 7, 6, 5, 1); c.fill(); c.stroke();
      ink(c);
      cone2(c, -13, -2, 13, 0, -34, '#c05a3e', '#96412e');
      c.beginPath(); c.moveTo(0, -34); c.lineTo(0, -44); c.stroke();
      c.fillStyle = '#d0483a'; fine(c); tri(c, 0, -44, 8, -41.5, 0, -39); c.fill(); c.stroke();
    }},
    windmill: { name: '风车', cat: '建筑', hit: 24, draw: function (c) {
      sh(c, 16); ink(c);
      c.fillStyle = '#f2e8d2'; poly(c, [[-12, 12], [-8, -10], [8, -10], [12, 12]]); c.fill(); c.stroke();
      c.fillStyle = '#5f4028'; rr(c, -3, 4, 6, 8, 1); c.fill(); c.stroke();
      c.fillStyle = '#e0b25e'; fine(c); dot(c, 0, -3, 2.5); c.fill(); c.stroke();
      cone2(c, -10, -10, 10, 0, -21, '#c05a3e', '#96412e');
      c.fillStyle = '#8a5f3c';
      for (var k = 0; k < 4; k++) {
        c.save(); c.translate(0, -14); c.rotate(Math.PI / 4 + k * Math.PI / 2);
        rr(c, -2.5, -18, 5, 16, 1.5); c.fill(); c.stroke();
        c.restore();
      }
      c.fillStyle = '#96412e'; fine(c); dot(c, 0, -14, 3); c.fill(); c.stroke();
    }},
    dock: { name: '码头', cat: '建筑', hit: 30, draw: function (c) {
      sh(c, 24); ink(c);
      c.fillStyle = '#8a5f3c'; rr(c, -26, -3, 34, 11, 1); c.fill(); c.stroke();
      c.strokeStyle = '#5f4028'; fine(c);
      c.beginPath(); c.moveTo(-17, -3); c.lineTo(-17, 8); c.moveTo(-7, -3); c.lineTo(-7, 8); c.stroke();
      c.fillStyle = '#5f4028';
      rr(c, -24, 8, 4, 4, 1); c.fill(); c.stroke();
      rr(c, -13, 8, 4, 4, 1); c.fill(); c.stroke();
      rr(c, -2, 8, 4, 4, 1); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(3, -3); c.lineTo(3, -9); c.stroke();
      c.fillStyle = '#e0b25e'; dot(c, 3, -10.5, 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(24.5, 5); c.lineTo(24.5, -9); c.stroke();
      c.fillStyle = '#f5efdc'; tri(c, 26, 4, 26, -8, 35, 4); c.fill(); c.stroke();
      ink(c);
      c.fillStyle = '#5f4028'; poly(c, [[14, 5], [36, 5], [31, 12], [19, 12]]); c.fill(); c.stroke();
    }},
    village: { name: '村落', cat: '建筑', hit: 36, draw: function (c) {
      sh(c, 27); ink(c);
      c.fillStyle = '#e0b25e'; fine(c);
      poly(c, [[-6, 12], [6, 12], [2, 3], [-2, 3]]); c.fill(); c.stroke();
      ink(c);
      c.fillStyle = '#f2e8d2'; rr(c, 16, 2, 12, 10, 1); c.fill(); c.stroke();
      c.fillStyle = '#5f4028'; fine(c); rr(c, 20, 6, 4, 6, 1); c.fill(); c.stroke();
      ink(c); cone2(c, 14, 2, 30, 22, -9, '#c05a3e', '#96412e');
      c.fillStyle = '#f2e8d2'; rr(c, -24, 0, 13, 12, 1); c.fill(); c.stroke();
      c.fillStyle = '#5f4028'; fine(c); rr(c, -21.5, 5, 5, 7, 1); c.fill(); c.stroke();
      c.fillStyle = '#e0b25e'; rr(c, -15.5, 3, 4, 4, 1); c.fill(); c.stroke();
      ink(c); hipped(c, -17.5, 0, 10, -8, 6, -13, 3.5, '#c05a3e', '#96412e');
      c.fillStyle = '#f2e8d2'; rr(c, -4, -4, 16, 16, 1); c.fill(); c.stroke();
      c.fillStyle = '#5f4028'; fine(c); rr(c, 1, 4, 6, 8, 1); c.fill(); c.stroke();
      c.fillStyle = '#e0b25e';
      rr(c, -3, -1, 4, 4, 1); c.fill(); c.stroke(); rr(c, 8, -1, 4, 4, 1); c.fill(); c.stroke();
      ink(c); hipped(c, 4, -4, 12, -15, 7, -22, 4, '#c05a3e', '#96412e');
    }},
    wall: { name: '城墙', cat: '建筑', hit: 30, draw: function (c) {
      sh(c, 24); ink(c);
      c.fillStyle = '#aab2ae'; rr(c, -26, -6, 52, 18, 1); c.fill(); c.stroke();
      c.fillStyle = '#7e8884'; rr(c, 20, -6, 6, 18, 1); c.fill(); c.stroke();
      c.fillStyle = '#aab2ae';
      rr(c, -24, -12, 8, 6, 1); c.fill(); c.stroke();
      rr(c, -10, -12, 8, 6, 1); c.fill(); c.stroke();
      rr(c, 4, -12, 8, 6, 1); c.fill(); c.stroke();
      rr(c, 18, -12, 8, 6, 1); c.fill(); c.stroke();
      c.strokeStyle = '#7e8884'; fine(c);
      c.beginPath(); c.moveTo(-26, 2); c.lineTo(26, 2); c.stroke();
      c.beginPath(); c.moveTo(-12, 2); c.lineTo(-12, 12); c.moveTo(4, 2); c.lineTo(4, 12); c.moveTo(20, 2); c.lineTo(20, 12); c.stroke();
    }},
    bridge: { name: '桥梁', cat: '建筑', hit: 30, draw: function (c) {
      sh(c, 26); ink(c);
      c.fillStyle = '#5f4028';
      rr(c, -16, 1, 4, 11, 1); c.fill(); c.stroke();
      rr(c, -2, -1, 4, 13, 1); c.fill(); c.stroke();
      rr(c, 12, 1, 4, 11, 1); c.fill(); c.stroke();
      c.fillStyle = '#8a5f3c';
      c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(0, -14, 26, 0); c.lineTo(26, 6); c.quadraticCurveTo(0, -8, -26, 6); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#5f4028'; fine(c);
      c.beginPath();
      c.moveTo(-18, -3.6); c.lineTo(-18, 2.4);
      c.moveTo(-9, -6.2); c.lineTo(-9, -0.2);
      c.moveTo(0, -7); c.lineTo(0, -1);
      c.moveTo(9, -6.2); c.lineTo(9, -0.2);
      c.moveTo(18, -3.6); c.lineTo(18, 2.4);
      c.stroke();
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(-26, -2); c.quadraticCurveTo(0, -20, 26, -2); c.stroke();
      fine(c);
      c.beginPath();
      c.moveTo(-26, -2); c.lineTo(-26, 0);
      c.moveTo(-22, -4.6); c.lineTo(-22, -2);
      c.moveTo(-11, -9.4); c.lineTo(-11, -5.7);
      c.moveTo(0, -11); c.lineTo(0, -7);
      c.moveTo(11, -9.4); c.lineTo(11, -5.7);
      c.moveTo(22, -4.6); c.lineTo(22, -2);
      c.moveTo(26, -2); c.lineTo(26, 0);
      c.stroke();
    }},
    tree: { name: '树木', cat: '自然', hit: 16, draw: function (c) {
      sh(c, 14); ink(c);
      c.fillStyle = '#5f4028'; rr(c, -2, 4, 4, 8, 1); c.fill(); c.stroke();
      c.fillStyle = '#426b34'; dot(c, 4, 0, 11); c.fill(); c.stroke();
      c.fillStyle = '#5c8a46'; dot(c, -4, -8, 12); c.fill(); c.stroke();
      c.fillStyle = '#79a851'; dot(c, -8, -12, 4); c.fill();
    }},
    pine: { name: '松树', cat: '自然', hit: 14, draw: function (c) {
      sh(c, 11); ink(c);
      c.fillStyle = '#5f4028'; rr(c, -2, 6, 4, 6, 1); c.fill(); c.stroke();
      cone2(c, -13, 8, 13, 0, -2, '#426b34', '#3d6a4f');
      cone2(c, -10, -2, 10, 0, -12, '#5c8a46', '#426b34');
      cone2(c, -7, -12, 7, 0, -22, '#79a851', '#5c8a46');
    }},
    fruit: { name: '果树', cat: '自然', hit: 16, draw: function (c) {
      sh(c, 14); ink(c);
      c.fillStyle = '#8a5f3c'; rr(c, -2, 4, 4, 8, 1); c.fill(); c.stroke();
      c.fillStyle = '#426b34'; dot(c, 4, 0, 11); c.fill(); c.stroke();
      c.fillStyle = '#5c8a46'; dot(c, -4, -8, 12); c.fill(); c.stroke();
      c.fillStyle = '#79a851'; dot(c, -8, -12, 4); c.fill();
      c.fillStyle = '#c9463d'; fine(c);
      dot(c, -8, -4, 2); c.fill(); c.stroke();
      dot(c, 2, -12, 2); c.fill(); c.stroke();
      dot(c, 8, -1, 2); c.fill(); c.stroke();
      dot(c, -2, 2, 2); c.fill(); c.stroke();
    }},
    rock: { name: '岩石', cat: '自然', hit: 18, draw: function (c) {
      sh(c, 17); ink(c);
      c.fillStyle = '#aab2ae'; poly(c, [[-16, 10], [-13, -4], [-4, -11], [8, -9], [15, 1], [12, 10]]); c.fill(); c.stroke();
      c.fillStyle = '#7e8884'; poly(c, [[-4, 10], [8, -9], [15, 1], [12, 10]]); c.fill(); c.stroke();
      c.strokeStyle = '#7e8884'; fine(c);
      c.beginPath(); c.moveTo(-2, -10); c.lineTo(0, -3); c.lineTo(-4, 3); c.lineTo(-1, 10); c.stroke();
      ink(c);
      c.fillStyle = '#7e8884'; dot(c, -20, 9, 2.5); c.fill(); c.stroke();
      c.fillStyle = '#aab2ae'; tri(c, 12, 10, 21, 10, 17, 2); c.fill(); c.stroke();
    }},
    tuft: { name: '草丛', cat: '自然', hit: 8, draw: function (c) {
      sh(c, 7); ink(c); fine(c);
      c.fillStyle = '#426b34';
      tri(c, -8, 12, -5, 12, -10, 4); c.fill(); c.stroke();
      tri(c, -2, 12, 1, 12, -2, -5); c.fill(); c.stroke();
      tri(c, 3, 12, 6, 12, 6, -1); c.fill(); c.stroke();
      c.fillStyle = '#5c8a46';
      tri(c, -5, 12, -2, 12, -7, -2); c.fill(); c.stroke();
      tri(c, 0, 12, 3, 12, 2, -6); c.fill(); c.stroke();
      tri(c, 6, 12, 9, 12, 10, 4); c.fill(); c.stroke();
    }},
    stone_s: { name: '碎石', cat: '自然', hit: 8, draw: function (c) {
      sh(c, 6); ink(c);
      c.fillStyle = '#aab2ae'; poly(c, [[-7, 12], [-5, 3], [1, 0], [6, 4], [5, 12]]); c.fill(); c.stroke();
      c.fillStyle = '#7e8884'; poly(c, [[4, 12], [7, 5], [10, 8], [9, 12]]); c.fill(); c.stroke();
      dot(c, -9, 10, 2); c.fill(); c.stroke();
      c.strokeStyle = '#7e8884'; fine(c);
      c.beginPath(); c.moveTo(1, 1); c.lineTo(-1, 5); c.lineTo(1, 9); c.stroke();
    }},
    ruins: { name: '遗迹', cat: '地标', hit: 24, draw: function (c) {
      sh(c, 20); ink(c);
      c.fillStyle = '#aab2ae'; rr(c, -20, 7, 40, 5, 1); c.fill(); c.stroke();
      rr(c, -15, -12, 6, 19, 1); c.fill(); c.stroke();
      c.fillStyle = '#7e8884'; rr(c, -16.5, -16, 9, 4, 1); c.fill(); c.stroke();
      c.fillStyle = '#aab2ae'; rr(c, -4, -18, 6, 25, 1); c.fill(); c.stroke();
      c.fillStyle = '#7e8884'; rr(c, -5.5, -22, 9, 4, 1); c.fill(); c.stroke();
      c.fillStyle = '#aab2ae'; poly(c, [[4, 7], [4, -1], [6.5, -3], [8, -1], [10, -2], [10, 7]]); c.fill(); c.stroke();
      c.fillStyle = '#7e8884'; rr(c, 11, 2, 13, 5, 2.5); c.fill(); c.stroke();
      poly(c, [[-24, 12], [-21, 8], [-17, 12]]); c.fill(); c.stroke();
      c.fillStyle = '#aab2ae'; tri(c, 18, 12, 24, 12, 21, 8); c.fill(); c.stroke();
    }},
    waypoint: { name: '传送锚点', cat: '地标', hit: 16, draw: function (c) {
      sh(c, 11); ink(c);
      c.fillStyle = '#aab2ae'; c.beginPath(); c.ellipse(0, 9.5, 10, 3.5, 0, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = '#227f95'; fine(c);
      c.save(); c.translate(0, -1.5); c.rotate(Math.PI / 4); rr(c, -6.5, -6.5, 13, 13, 2); c.fill(); c.stroke(); c.restore();
      c.fillStyle = '#3ab5c9';
      c.save(); c.translate(0, -3.5); c.rotate(Math.PI / 4); rr(c, -6.5, -6.5, 13, 13, 2); c.fill(); c.stroke(); c.restore();
      c.fillStyle = '#f5efdc';
      c.save(); c.translate(0, -3.5); c.rotate(Math.PI / 4); rr(c, -2.6, -2.6, 5.2, 5.2, 1); c.fill(); c.stroke(); c.restore();
      c.fillStyle = '#e0b25e';
      dot(c, -11, -5, 1.4); c.fill();
      dot(c, 11, -9, 1.2); c.fill();
      dot(c, 2, -16, 1.3); c.fill();
    }},
    statue: { name: '七天神像', cat: '地标', hit: 18, draw: function (c) {
      sh(c, 13); ink(c);
      c.fillStyle = '#7e8884';
      poly(c, [[-4, -13], [-16, -3], [-3, -4]]); c.fill(); c.stroke();
      poly(c, [[4, -13], [16, -3], [3, -4]]); c.fill(); c.stroke();
      c.fillStyle = '#aab2ae'; rr(c, -7, 4, 14, 5, 1); c.fill(); c.stroke();
      c.fillStyle = '#7e8884'; rr(c, -9, 9, 18, 3, 1); c.fill(); c.stroke();
      c.fillStyle = '#aab2ae'; poly(c, [[-5, 4], [-4, -12], [4, -12], [5, 4]]); c.fill(); c.stroke();
      dot(c, 0, -16, 4); c.fill(); c.stroke();
      c.fillStyle = '#e0b25e'; dot(c, 0, -24, 1.5); c.fill();
    }},
    camp: { name: '营地', cat: '地标', hit: 20, draw: function (c) {
      sh(c, 16); ink(c);
      c.fillStyle = '#c05a3e'; tri(c, -19, 12, -3, -13, 13, 12); c.fill(); c.stroke();
      c.fillStyle = '#5f4028'; tri(c, -9, 12, 3, 12, -3, 0); c.fill(); c.stroke();
      c.strokeStyle = '#5f4028'; fine(c);
      c.beginPath(); c.moveTo(18, 12); c.lineTo(26, 8); c.moveTo(26, 12); c.lineTo(18, 8); c.stroke();
      ink(c);
      c.fillStyle = '#e0b25e'; tri(c, 19.5, 9, 22.5, 1, 25.5, 9); c.fill(); c.stroke();
    }},
    marker: { name: '标记', cat: '地标', hit: 14, draw: function (c) {
      ink(c);
      c.fillStyle = '#f5efdc'; dot(c, 0, 0, 11); c.fill(); c.stroke();
      c.strokeStyle = '#d0483a'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-4.5, -4.5); c.lineTo(4.5, 4.5); c.moveTo(4.5, -4.5); c.lineTo(-4.5, 4.5); c.stroke();
    }}
  };
})(window.GMM.Decor = window.GMM.Decor || {});
