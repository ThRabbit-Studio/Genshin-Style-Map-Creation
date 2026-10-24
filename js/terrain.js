/* 地形渲染管线：把低分辨率涂鸦渲染成手绘风地图（GMM.Terrain） */
window.GMM = window.GMM || {};
(function (T, N) {
  "use strict";
  var clamp = N.clamp, fbm = N.fbm, vn = N.vn;

  T.RW = 1600; T.RH = 900;          // 渲染分辨率
  T.GW = 352; T.GH = 198;           // 涂鸦网格分辨率（16:9）
  T.GN = T.GW * T.GH;

  /* 色板：对照原神蒙德地区地图取样 */
  var C = T.C = {
    deep:  [26, 124, 150], deep2: [17, 100, 129], shal: [104, 201, 211],
    pale:  [168, 227, 231], foam: [231, 246, 242], wline: [15, 78, 102],
    coast: [44, 78, 66],
    sand1: [233, 217, 167], sand2: [208, 185, 133], wet: [186, 163, 118],
    gL: [181, 197, 112], gM: [146, 167, 80], gD: [118, 141, 66],
    gRimL: [128, 148, 72], gRimD: [94, 114, 55], gEdge: [116, 126, 72],
    f1: [110, 140, 74], f2: [80, 110, 50], fDot: [57, 87, 39], fHi: [128, 155, 82], fEdge: [50, 78, 37],
    r1: [176, 180, 177], r2: [128, 134, 133], rCv: [95, 101, 100], rEdge: [80, 86, 85],
    cont: [108, 127, 60], fcont: [44, 70, 34], shb: [82, 178, 192],
    fc1: [128, 119, 104], fc2: [84, 76, 64], fc3: [64, 58, 48],
    rd1: [228, 210, 162], rd2: [205, 181, 129], rdEdge: [167, 141, 93]
  };

  /* 渲染设置：交给用户调整的"分层"参数 */
  T.settings = {
    beach: true, beachW: 3.6,      // 自动沙滩层
    shallow: true, shallowW: 1.7,  // 自动浅滩层
    outline: 1,                    // 海岸描边强度 0~2
    cliff: 1,                      // 悬崖立体感 0~2
    cLevels: 7,                    // 等高线层数
    warpScale: 1,                  // 手绘扭曲强度（重建噪声场后生效）
    texture: 1,                    // 色块纹理强度
    contours: true,                // 等高线
    showCat: { 建筑: true, 自然: true, 地标: true }, // 分组图层显示
    showLabels: true               // 地名标注图层
  };

  /* 地区风格色板：整体替换 C 的取值 */
  function cloneC() { var o = {}, k; for (k in C) o[k] = C[k].slice(); return o; }
  T.PALETTE_NAME = 'mond';
  T.PALETTES = { mond: cloneC() };
  T.PALETTES.liyue = {
    deep: [22, 132, 138], deep2: [14, 110, 118], shal: [116, 204, 196], pale: [176, 232, 222],
    foam: [232, 248, 240], wline: [12, 82, 88], coast: [64, 84, 50],
    sand1: [240, 222, 168], sand2: [216, 192, 132], wet: [192, 168, 116],
    gL: [214, 214, 118], gM: [176, 184, 88], gD: [148, 156, 70],
    gRimL: [156, 162, 74], gRimD: [124, 132, 58], gEdge: [140, 146, 72],
    f1: [136, 158, 74], f2: [104, 128, 54], fDot: [76, 98, 40], fHi: [158, 176, 88], fEdge: [72, 94, 40],
    r1: [186, 176, 158], r2: [138, 130, 116], rCv: [104, 98, 88], rEdge: [88, 82, 74],
    cont: [146, 148, 64], fcont: [58, 78, 36], shb: [96, 190, 180],
    rd1: [236, 216, 164], rd2: [212, 188, 132], rdEdge: [172, 146, 96]
  };
  T.PALETTES.inazuma = {
    deep: [24, 110, 150], deep2: [14, 88, 124], shal: [120, 196, 216], pale: [180, 226, 238],
    foam: [232, 246, 248], wline: [14, 70, 104], coast: [62, 60, 86],
    sand1: [232, 214, 178], sand2: [206, 184, 142], wet: [182, 160, 122],
    gL: [186, 180, 120], gM: [146, 150, 92], gD: [118, 126, 72],
    gRimL: [128, 134, 78], gRimD: [96, 104, 60], gEdge: [124, 128, 80],
    f1: [104, 134, 80], f2: [78, 106, 58], fDot: [56, 80, 44], fHi: [124, 152, 90], fEdge: [46, 72, 42],
    r1: [172, 168, 176], r2: [126, 122, 132], rCv: [94, 90, 100], rEdge: [80, 76, 86],
    cont: [120, 120, 70], fcont: [40, 66, 46], shb: [96, 178, 200],
    rd1: [226, 206, 166], rd2: [200, 178, 134], rdEdge: [160, 138, 96]
  };
  T.PALETTES.chasm = {
    deep: [20, 96, 116], deep2: [12, 76, 94], shal: [92, 168, 182], pale: [150, 204, 210],
    foam: [222, 238, 236], wline: [12, 62, 80], coast: [40, 58, 52],
    sand1: [212, 196, 150], sand2: [184, 166, 118], wet: [160, 142, 100],
    gL: [158, 168, 96], gM: [122, 136, 72], gD: [98, 112, 58],
    gRimL: [106, 120, 62], gRimD: [80, 92, 48], gEdge: [98, 108, 60],
    f1: [92, 118, 64], f2: [70, 94, 46], fDot: [50, 72, 36], fHi: [108, 132, 70], fEdge: [42, 64, 32],
    r1: [150, 154, 152], r2: [108, 112, 110], rCv: [80, 84, 82], rEdge: [66, 70, 68],
    cont: [92, 104, 54], fcont: [36, 56, 28], shb: [76, 158, 172],
    rd1: [210, 192, 146], rd2: [186, 164, 116], rdEdge: [148, 124, 80]
  };
  T.applyPalette = function (name) {
    var p = T.PALETTES[name];
    if (!p || name === T.PALETTE_NAME) return false;
    for (var k in p) C[k] = p[k].slice();
    T.PALETTE_NAME = name;
    return true;
  };

  /* 涂鸦网格：0水 1草 2林 3山 4沙 5路；hgt 为真实高度场（0深海~1峰顶），等高线/分层设色/悬崖都由它驱动 */
  T.grid = new Uint8Array(T.GN);
  T.hgt = new Float32Array(T.GN);
  var distWater = new Float32Array(T.GN), distLand = new Float32Array(T.GN);
  var contourMask = new Float32Array(T.GN);
  /* 同质掩码：3×3 邻域全为同一地形的格子存 id+1（1=纯水），否则 0（边界区需完整采样） */
  var uniMask = new Uint8Array(T.GN);

  /* 覆盖度场：把涂鸦模糊成 0..1 的连续场，按 0.5 等值线分类 → 光滑手绘边界 */
  var cov = [null];
  for (var ct = 1; ct <= 5; ct++) cov.push(new Float32Array(T.GN));
  var blurTmp = new Float32Array(T.GN);

  function blurPass(f, w, h) {
    var x, y, i;
    for (y = 0; y < h; y++) {
      var row = y * w;
      for (x = 0; x < w; x++) {
        var a = f[row + (x > 0 ? x - 1 : 0)], b = f[row + x], c = f[row + (x < w - 1 ? x + 1 : w - 1)];
        blurTmp[row + x] = (a + 2 * b + c) * 0.25;
      }
    }
    for (y = 0; y < h; y++) {
      var up = (y > 0 ? y - 1 : 0) * w, dn = (y < h - 1 ? y + 1 : h - 1) * w;
      for (x = 0; x < w; x++) {
        i = y * w + x;
        f[i] = (blurTmp[up + x] + 2 * blurTmp[i] + blurTmp[dn + x]) * 0.25;
      }
    }
  }

  function chamfer(d) {
    var i, x, y, v, GW = T.GW, GH = T.GH;
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      i = y * GW + x; v = d[i];
      if (x > 0 && d[i - 1] + 1 < v) v = d[i - 1] + 1;
      if (y > 0) {
        if (d[i - GW] + 1 < v) v = d[i - GW] + 1;
        if (x > 0 && d[i - GW - 1] + 1.414 < v) v = d[i - GW - 1] + 1.414;
        if (x < GW - 1 && d[i - GW + 1] + 1.414 < v) v = d[i - GW + 1] + 1.414;
      }
      d[i] = v;
    }
    for (y = GH - 1; y >= 0; y--) for (x = GW - 1; x >= 0; x--) {
      i = y * GW + x; v = d[i];
      if (x < GW - 1 && d[i + 1] + 1 < v) v = d[i + 1] + 1;
      if (y < GH - 1) {
        if (d[i + GW] + 1 < v) v = d[i + GW] + 1;
        if (x < GW - 1 && d[i + GW + 1] + 1.414 < v) v = d[i + GW + 1] + 1.414;
        if (x > 0 && d[i + GW - 1] + 1.414 < v) v = d[i + GW - 1] + 1.414;
      }
      d[i] = v;
    }
  }

  /* 等高线：marching squares 从高度场提取（疏密随坡度自然变化），只画在陆地上 */
  T.buildContours = function () {
    var GW = T.GW, GH = T.GH, g = T.grid, i, x, y;
    contourMask.fill(0);
    var hMin = 1, hMax = 0;
    for (i = 0; i < T.GN; i++) if (g[i] > 0) { var h0 = T.hgt[i]; if (h0 < hMin) hMin = h0; if (h0 > hMax) hMax = h0; }
    if (hMax - hMin < 0.14) return;
    var levels = Math.max(3, Math.round(T.settings.cLevels));
    function ip(h1, h2) { return (iso - h1) / (h2 - h1); }
    function drawSeg(p, q) {
      var dx = q[0] - p[0], dy = q[1] - p[1];
      var n = Math.ceil(Math.hypot(dx, dy) * 2) + 1;
      for (var s = 0; s <= n; s++) {
        var ix = Math.round(p[0] + dx * s / n), iy = Math.round(p[1] + dy * s / n);
        if (ix < 0 || iy < 0 || ix >= GW || iy >= GH) continue;
        if (g[iy * GW + ix] > 0) contourMask[iy * GW + ix] = 1;
      }
    }
    var iso = 0;
    for (var li = 1; li <= levels; li++) {
      iso = hMin + (hMax - hMin) * li / (levels + 1);
      for (y = 0; y < GH - 1; y++) for (x = 0; x < GW - 1; x++) {
        i = y * GW + x;
        var a = T.hgt[i], b = T.hgt[i + 1], c = T.hgt[i + GW], d = T.hgt[i + GW + 1];
        var mn = Math.min(a, b, c, d), mx = Math.max(a, b, c, d);
        if (iso < mn || iso > mx) continue;
        var pts = [];
        if ((a >= iso) !== (b >= iso)) pts.push([x + ip(a, b), y]);
        if ((c >= iso) !== (d >= iso)) pts.push([x + ip(c, d), y + 1]);
        if ((a >= iso) !== (c >= iso)) pts.push([x, y + ip(a, c)]);
        if ((b >= iso) !== (d >= iso)) pts.push([x + 1, y + ip(b, d)]);
        if (pts.length >= 2) {
          drawSeg(pts[0], pts[1]);
          if (pts.length === 4) drawSeg(pts[2], pts[3]);
        }
      }
    }
    blurPass(contourMask, GW, GH);
  };

  T.refreshDists = function () {
    var i, v, g = T.grid, t, x, y;
    for (i = 0; i < T.GN; i++) { v = g[i]; distWater[i] = v === 0 ? 0 : 1e9; }
    for (i = 0; i < T.GN; i++) { v = g[i]; distLand[i] = v > 0 ? 0 : 1e9; }
    chamfer(distWater); chamfer(distLand);
    for (t = 1; t <= 5; t++) {
      var f = cov[t];
      for (i = 0; i < T.GN; i++) f[i] = g[i] === t ? 1 : 0;
      blurPass(f, T.GW, T.GH);
      blurPass(f, T.GW, T.GH);
    }
    /* 等高线提取 + 同质掩码 */
    for (y = 0; y < T.GH; y++) for (x = 0; x < T.GW; x++) {
      i = y * T.GW + x;
      var v0 = g[i], ok = 1;
      for (var dy2 = -1; dy2 <= 1 && ok; dy2++) for (var dx2 = -1; dx2 <= 1; dx2++) {
        var x3 = x + dx2, y3 = y + dy2;
        if (x3 < 0 || y3 < 0 || x3 >= T.GW || y3 >= T.GH || g[y3 * T.GW + x3] !== v0) { ok = 0; break; }
      }
      uniMask[i] = ok ? v0 + 1 : 0;
    }
    T.buildContours();
  };

  function upsample(src, SW, SH, dst, w, h) {
    for (var y = 0; y < h; y++) {
      var fy = clamp((y + 0.5) * SH / h - 0.5, 0, SH - 1);
      var j0 = fy | 0, j1 = j0 + 1 < SH ? j0 + 1 : j0, ty = fy - j0;
      for (var x = 0; x < w; x++) {
        var fx = clamp((x + 0.5) * SW / w - 0.5, 0, SW - 1);
        var i0 = fx | 0, i1 = i0 + 1 < SW ? i0 + 1 : i0, tx = fx - i0;
        var a = src[j0 * SW + i0], b = src[j0 * SW + i1], c = src[j1 * SW + i0], d = src[j1 * SW + i1];
        var t = a + (b - a) * tx, s = c + (d - c) * tx;
        dst[y * w + x] = t + (s - t) * ty;
      }
    }
  }

  /* 预计算噪声场：扭曲、色块、纹理 */
  T.makeFields = function (w, h) {
    var F = { w: w, h: h };
    var SW = Math.max(4, Math.round(w / 4)), SH = Math.max(4, Math.round(h / 4)), Ns = SW * SH;
    var swx = new Float32Array(Ns), swy = new Float32Array(Ns),
        spt = new Float32Array(Ns), spt2 = new Float32Array(Ns),
        sfw = new Float32Array(Ns), srk = new Float32Array(Ns),
        srf = new Float32Array(Ns), swt = new Float32Array(Ns);
    var ws = T.settings.warpScale;
    var A1 = 0.034 * T.RH * ws, A2 = 0.011 * T.RH * ws;
    for (var j = 0; j < SH; j++) for (var i = 0; i < SW; i++) {
      var k = j * SW + i, mu = (i * 4) / h, mv = (j * 4) / h;
      swx[k] = (fbm(mu * 1.15, mv * 1.15, 3) - 0.5) * 2 * A1
             + (fbm(mu * 2.9 + 40.2, mv * 2.9 + 17.8, 2) - 0.5) * 2 * A2;
      swy[k] = (fbm(mu * 1.15 + 90.7, mv * 1.15 + 55.1, 3) - 0.5) * 2 * A1
             + (fbm(mu * 2.9 + 4.9, mv * 2.9 + 63.3, 2) - 0.5) * 2 * A2;
      spt[k]  = fbm(mu * 3.2 + 7.7, mv * 3.2 + 3.1, 3);
      spt2[k] = fbm(mu * 6.4 + 51.2, mv * 6.4 + 29.6, 2);
      sfw[k]  = fbm(mu * 5.2 + 90.1, mv * 5.2 + 33.7, 2);
      srk[k]  = fbm(mu * 7 + 3.3, mv * 7 + 8.8, 2);
      srf[k]  = fbm(mu * 17 + 1.2, mv * 17 + 5.4, 2);
      swt[k]  = fbm(mu * 2.1 + 50.5, mv * 2.1 + 66.2, 3);
    }
    F.wx = new Float32Array(w * h); F.wy = new Float32Array(w * h);
    F.pt = new Float32Array(w * h); F.pt2 = new Float32Array(w * h);
    F.fw = new Float32Array(w * h); F.rk = new Float32Array(w * h);
    F.rkF = new Float32Array(w * h); F.wt = new Float32Array(w * h);
    F.fine = new Float32Array(w * h); F.stipple = new Float32Array(w * h);
    upsample(swx, SW, SH, F.wx, w, h); upsample(swy, SW, SH, F.wy, w, h);
    upsample(spt, SW, SH, F.pt, w, h); upsample(spt2, SW, SH, F.pt2, w, h);
    upsample(sfw, SW, SH, F.fw, w, h); upsample(srk, SW, SH, F.rk, w, h);
    upsample(srf, SW, SH, F.rkF, w, h); upsample(swt, SW, SH, F.wt, w, h);
    for (var y2 = 0; y2 < h; y2++) {
      var mv2 = (y2 + 0.5) / h;
      for (var x2 = 0; x2 < w; x2++) {
        var fi = y2 * w + x2, mu2 = (x2 + 0.5) / h;
        F.fine[fi] = vn(mu2 * 30, mv2 * 30) * 0.6 + vn(mu2 * 11 + 37, mv2 * 11 + 91) * 0.4;
        F.stipple[fi] = vn(mu2 * 80, mv2 * 80);
      }
    }
    return F;
  };

  /* 核心渲染：一次逐像素扫描 */
  T.renderMap = function (F, img) {
    T.refreshDists();
    var out = new Uint32Array(img.data.buffer);
    var w = F.w, h = F.h, wx = F.wx, wy = F.wy, pt = F.pt, pt2 = F.pt2,
        rk = F.rk, rkF = F.rkF, fw = F.fw, wt = F.wt, st = F.stipple, fn = F.fine;
    var gscx = T.GW / w, gscy = T.GH / h;
    var DW = distWater, DL = distLand;
    var DEEP = C.deep, DEEP2 = C.deep2, SHAL = C.shal, PALE = C.pale, FOAM = C.foam, WL = C.wline,
        COAST = C.coast, SA1 = C.sand1, SA2 = C.sand2, WET = C.wet,
        GL = C.gL, GM = C.gM, GD = C.gD, GRL = C.gRimL, GRD = C.gRimD, GE = C.gEdge,
        F1 = C.f1, F2 = C.f2, FD = C.fDot, FH = C.fHi, FE = C.fEdge,
        R1 = C.r1, R2 = C.r2, RC = C.rCv, RE = C.rEdge,
        CONT = C.cont, FCONT = C.fcont, SHB = C.shb,
        FC1 = C.fc1, FC2 = C.fc2, FC3 = C.fc3,
        RA1 = C.rd1, RA2 = C.rd2, RAE = C.rdEdge;
    var SET = T.settings;
    var GW = T.GW, GH = T.GH;
    var _br = 0, _bg = 0, _bb = 0;
    var _h = 0;
    var hgtF = T.hgt;

    function fieldAt(f, fx, fy) {
      if (fx < 0) fx = 0; else if (fx > GW - 1) fx = GW - 1;
      if (fy < 0) fy = 0; else if (fy > GH - 1) fy = GH - 1;
      var ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
      var ix1 = ix + 1 < GW ? ix + 1 : ix, iy1 = iy + 1 < GH ? iy + 1 : iy, i00 = iy * GW + ix;
      var a = f[i00], b = f[iy * GW + ix1], c = f[iy1 * GW + ix], d = f[iy1 * GW + ix1];
      var t = a + (b - a) * tx, s = c + (d - c) * tx;
      return t + (s - t) * ty;
    }

    /* 各地形的基础色（写入 _br/_bg/_bb）；_h 为当前像素高度 */
    function baseColor(tp, dNear, fx, fy) {
      var fi2 = 0, s3 = 0;
      if (tp === 1) { /* 草地：海拔色带（低地深绿→坡地中绿→平缓亮黄绿）+ 水彩色块 */
        var alt = clamp((_h - 0.15) / 0.55, 0, 0.92);
        if (alt < 0.5) {
          var k1a = alt * 2;
          _br = GD[0] + (GM[0] - GD[0]) * k1a;
          _bg = GD[1] + (GM[1] - GD[1]) * k1a;
          _bb = GD[2] + (GM[2] - GD[2]) * k1a;
        } else {
          var k1b = (alt - 0.5) * 2;
          _br = GM[0] + (GL[0] - GM[0]) * k1b;
          _bg = GM[1] + (GL[1] - GM[1]) * k1b;
          _bb = GM[2] + (GL[2] - GM[2]) * k1b;
        }
        var mg = 1 + (pt[_fi] - 0.5) * (0.20 * SET.texture) + (fn[_fi] - 0.5) * (0.10 * SET.texture) + (pt2[_fi] - 0.5) * (0.08 * SET.texture);
        _br *= mg; _bg *= mg; _bb *= mg;
        if (SET.contours && dNear > 1.0) {
          var cv2 = fieldAt(contourMask, fx, fy);
          if (cv2 > 0.42) {
            var ink = 0.42 * Math.min(1, (cv2 - 0.42) / 0.25) * (0.65 + 0.5 * fn[_fi]);
            _br += (CONT[0] - _br) * ink; _bg += (CONT[1] - _bg) * ink; _bb += (CONT[2] - _bb) * ink;
          }
        }
      } else if (tp === 2) { /* 森林：暗色海拔带 + 团冠纹理 */
        var q = fw[_fi] * 0.3 + clamp((_h - 0.15) / 0.55, 0, 1) * 0.7;
        _br = F2[0] + (F1[0] - F2[0]) * q;
        _bg = F2[1] + (F1[1] - F2[1]) * q;
        _bb = F2[2] + (F1[2] - F2[2]) * q;
        s3 = st[_fi];
        if (s3 > 0.62) { _br += (FD[0] - _br) * 0.55; _bg += (FD[1] - _bg) * 0.55; _bb += (FD[2] - _bb) * 0.55; }
        else if (s3 < 0.22) { _br += (FH[0] - _br) * 0.3; _bg += (FH[1] - _bg) * 0.3; _bb += (FH[2] - _bb) * 0.3; }
        if (SET.contours && Math.abs(q - 0.5) < 0.06) {
          fi2 = 0.3 * (0.7 + 0.6 * fn[_fi]);
          _br += (FCONT[0] - _br) * fi2; _bg += (FCONT[1] - _bg) * fi2; _bb += (FCONT[2] - _bb) * fi2;
        }
      } else if (tp === 3) { /* 山地台面 */
        var qr = (rk[_fi] - 0.5) * 1.35 + 0.5;
        if (qr < 0) qr = 0; else if (qr > 1) qr = 1;
        _br = R2[0] + (R1[0] - R2[0]) * qr;
        _bg = R2[1] + (R1[1] - R2[1]) * qr;
        _bb = R2[2] + (R1[2] - R2[2]) * qr;
        var rf = rkF[_fi];
        if (rf > 0.455 && rf < 0.485 || rf > 0.515 && rf < 0.545) {
          _br += (RC[0] - _br) * 0.5; _bg += (RC[1] - _bg) * 0.5; _bb += (RC[2] - _bb) * 0.5;
        }
      } else if (tp === 4) { /* 沙滩 */
        var ft = fn[_fi];
        _br = SA2[0] + (SA1[0] - SA2[0]) * ft;
        _bg = SA2[1] + (SA1[1] - SA2[1]) * ft;
        _bb = SA2[2] + (SA1[2] - SA2[2]) * ft;
      } else { /* 道路 */
        var fr = fn[_fi];
        _br = RA2[0] + (RA1[0] - RA2[0]) * fr;
        _bg = RA2[1] + (RA1[1] - RA2[1]) * fr;
        _bb = RA2[2] + (RA1[2] - RA2[2]) * fr;
      }
    }

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var fi = y * w + x;
        _fi = fi;
        var sx = x + wx[fi], sy = y + wy[fi];
        var fx = sx * gscx - 0.5, fy = sy * gscy - 0.5;
        if (fx < 0) fx = 0; else if (fx > GW - 1) fx = GW - 1;
        if (fy < 0) fy = 0; else if (fy > GH - 1) fy = GH - 1;
        var r, g, b;

        /* 同质捷径：大片内部区域直接按最近格分类，只有边界区做完整覆盖度采样 */
        var nix = (fx + 0.5) | 0; if (nix < 0) nix = 0; else if (nix >= GW) nix = GW - 1;
        var niy = (fy + 0.5) | 0; if (niy < 0) niy = 0; else if (niy >= GH) niy = GH - 1;
        var uni = uniMask[niy * GW + nix];
        var sum = 0, id = 0, sec = 0;

        if (uni === 1) { /* 纯水内部 */
          id = 0;
        } else if (uni > 1) { /* 同质陆地内部 */
          id = uni - 1; sum = 1;
        } else {
          var c1 = fieldAt(cov[1], fx, fy), c3 = fieldAt(cov[3], fx, fy),
              c4 = fieldAt(cov[4], fx, fy), c5 = fieldAt(cov[5], fx, fy);
        var c2 = fieldAt(cov[2], fx, fy);
        if (c2 > 0.12 && c2 < 0.88) {
          c2 += (pt2[fi] - 0.5) * 0.42;
          if (c2 < 0) c2 = 0;
        }
          sum = c1 + c2 + c3 + c4 + c5;
          if (sum >= 0.5) {
            var best = 1, bv = c1, sv = -1;
            if (c2 > bv) { sv = bv; sec = best; bv = c2; best = 2; } else if (c2 > sv) { sv = c2; sec = 2; }
            if (c3 > bv) { sv = bv; sec = best; bv = c3; best = 3; } else if (c3 > sv) { sv = c3; sec = 3; }
            if (c4 > bv) { sv = bv; sec = best; bv = c4; best = 4; } else if (c4 > sv) { sv = c4; sec = 4; }
            if (c5 > bv) { sv = bv; sec = best; bv = c5; best = 5; } else if (c5 > sv) { sv = c5; sec = 5; }
            id = best;
          }
        }

        if (sum < 0.5) { /* 海洋：深度渐变 + 岸波分层 */
          var dL = fieldAt(DL, fx, fy);
          var t = dL / 7; if (t > 1) t = 1; t = t * t * (3 - 2 * t);
          r = SHAL[0] + (DEEP[0] - SHAL[0]) * t;
          g = SHAL[1] + (DEEP[1] - SHAL[1]) * t;
          b = SHAL[2] + (DEEP[2] - SHAL[2]) * t;
          var m = 1 + (wt[fi] - 0.5) * 0.12; r *= m; g *= m; b *= m;
          if (dL > 12) {
            var kd = Math.min((dL - 12) / 12, 1) * 0.55;
            r += (DEEP2[0] - r) * kd; g += (DEEP2[1] - g) * kd; b += (DEEP2[2] - b) * kd;
          }
          if (SET.shallow && dL < SET.shallowW) {
            var kp = (1 - dL / SET.shallowW) * 0.42;
            r += (PALE[0] - r) * kp; g += (PALE[1] - g) * kp; b += (PALE[2] - b) * kp;
          } else if (SET.shallow && dL < SET.shallowW + 0.55) {
            r += (SHB[0] - r) * 0.4; g += (SHB[1] - g) * 0.4; b += (SHB[2] - b) * 0.4;
          }
          /* 三道起伏岸波 */
          if (dL > SET.shallowW + 0.4) {
            var bw = Math.abs(dL - (SET.shallowW + 1.5));
            if (bw < 0.22) { r += (FOAM[0] - r) * 0.26; g += (FOAM[1] - g) * 0.26; b += (FOAM[2] - b) * 0.26; }
            bw = Math.abs(dL - (SET.shallowW + 2.9));
            if (bw < 0.2) { r += (SHB[0] - r) * 0.22; g += (SHB[1] - g) * 0.22; b += (SHB[2] - b) * 0.22; }
            bw = Math.abs(dL - (SET.shallowW + 4.6));
            if (bw < 0.18) { r += (SHB[0] - r) * 0.14; g += (SHB[1] - g) * 0.14; b += (SHB[2] - b) * 0.14; }
          }
          if (dL < 1.2) {
            var kf = 1 - dL / 1.2, kff = 0.3 + 0.5 * kf * kf;
            r += (FOAM[0] - r) * kff; g += (FOAM[1] - g) * kff; b += (FOAM[2] - b) * kff;
          } else if (dL < 8 && wt[fi] > 0.64 && st[fi] > 0.82) {
            r += (FOAM[0] - r) * 0.3; g += (FOAM[1] - g) * 0.3; b += (FOAM[2] - b) * 0.3;
          }
          if (dL < 0.5) {
            var kw = (1 - dL / 0.5) * 0.35;
            r += (WL[0] - r) * kw; g += (WL[1] - g) * kw; b += (WL[2] - b) * kw;
          }
          /* 水面颗粒 */
          var gw = 1 + (fn[fi] - 0.5) * 0.05 * SET.texture;
          r *= gw; g *= gw; b *= gw;
        } else { /* 陆地：取覆盖度最高的类型 */
          var onRoad = (id === 5);
          var dW = fieldAt(DW, fx, fy);
          _h = fieldAt(hgtF, fx, fy);

          /* 基础色 */
          baseColor(id, dW, fx, fy);
          r = _br; g = _bg; b = _bb;

          /* 地块之间融合过渡（点彩抖动打破均匀渐变） */
          var blended = 0;
          if (sec > 0.16 && !onRoad && sec !== 5) {
            baseColor(sec, dW);
            var tb = Math.min(0.8, (sec - 0.16) / 0.38);
            tb *= (id === 3 || sec === 3) ? (st[fi] > 0.55 ? 1.15 : 0.65) : (st[fi] > 0.55 ? 1.5 : 0.45);
            if (tb > 0.02) {
              r += (_br - r) * tb; g += (_bg - g) * tb; b += (_bb - b) * tb;
              blended = tb;
            }
          }

          /* 自动沙滩层：向沙色渐变过渡 + 湿润暗带 */
          var beachW = SET.beach ? SET.beachW : 0;
          if (!onRoad && dW < beachW) {
            var ts = Math.min(1, (1 - dW / beachW) * (st[fi] > 0.5 ? 1.35 : 0.65) * 1.4);
            baseColor(4, dW);
            r += (_br - r) * ts; g += (_bg - g) * ts; b += (_bb - b) * ts;
            if (dW < 0.9) {
              var kw2 = (1 - dW / 0.9) * 0.5;
              r += (WET[0] - r) * kw2; g += (WET[1] - g) * kw2; b += (WET[2] - b) * kw2;
            }
            /* 赛璐璐内侧亮边：描边内一圈受光 */
          } else if (dW > 0.72 && dW < 1.15) {
            r *= 1.055; g *= 1.05; b *= 1.04;
          }

          /* 2.5D：悬崖立面与投影，全部由高度场梯度驱动（山地/高地朝东南的落差生成岩壁，并向右下投射软阴影） */
          var str = 0.5 + 0.3 * SET.cliff;
          if (SET.cliff > 0) {
            var hSE = fieldAt(hgtF, fx + 2.4, fy + 2.4);
            var dh = _h - hSE;
            if (dh > 0.045) {
              var hi = clamp((_h - 0.42) / 0.18, 0, 1);
              var face = Math.min(1, (dh - 0.045) * 6) * hi * str;
              if (face > 0) {
                var cl = Math.min(1, face * 1.3);
                var cr2 = FC1[0] + (FC2[0] - FC1[0]) * cl;
                var cg2 = FC1[1] + (FC2[1] - FC1[1]) * cl;
                var cb2 = FC1[2] + (FC2[2] - FC1[2]) * cl;
                var stri = (rkF[fi] - 0.5) * 0.5 * cl;
                cr2 += (FC3[0] - cr2) * Math.max(0, stri);
                cg2 += (FC3[1] - cg2) * Math.max(0, stri);
                cb2 += (FC3[2] - cb2) * Math.max(0, stri);
                r += (cr2 - r) * face; g += (cg2 - g) * face; b += (cb2 - b) * face;
              }
            }
            var hNW = fieldAt(hgtF, fx - 2.4, fy - 2.4);
            var dhU = hNW - _h;
            if (dhU > 0.045) {
              var cast = Math.min(1, (dhU - 0.045) * 5) * clamp((hNW - 0.42) / 0.18, 0, 1) * str;
              if (cast > 0) {
                var sm = 1 - 0.28 * cast;
                r *= sm; g *= sm; b *= sm;
              }
            }
          }

          /* 描边：海岸深色轮廓 + 地块之间的细边 */
          var wsum = 1 - sum;
          var olv = SET.outline;
          if (olv > 0 && wsum > 0.34 - 0.07 * olv) {
            var ko = Math.min(0.68 + 0.14 * olv, 0.95);
            r += (COAST[0] - r) * ko; g += (COAST[1] - g) * ko; b += (COAST[2] - b) * ko;
          } else if (sec > 0.30 && blended < 0.2) {
            if (id === 5 || sec === 5) { r += (RAE[0] - r) * 0.5; g += (RAE[1] - g) * 0.5; b += (RAE[2] - b) * 0.5; }
            else if (id === 3 || sec === 3) { r += (RE[0] - r) * 0.35; g += (RE[1] - g) * 0.35; b += (RE[2] - b) * 0.35; }
            else if (id === 2) { r += (FE[0] - r) * 0.5; g += (FE[1] - g) * 0.5; b += (FE[2] - b) * 0.5; }
            else if (sec === 2) { r += (FE[0] - r) * 0.25; g += (FE[1] - g) * 0.25; b += (FE[2] - b) * 0.25; }
            else { r += (GE[0] - r) * 0.18; g += (GE[1] - g) * 0.18; b += (GE[2] - b) * 0.18; }
          }

          /* 水彩颗粒：亮度 + 微小色相抖动 */
          var gk = 1 + (fn[fi] - 0.5) * 0.09 * SET.texture + (st[fi] - 0.5) * 0.045 * SET.texture;
          r *= gk; g *= gk; b *= (gk + (st[fi] - 0.5) * 0.03 * SET.texture);
        }

        r = r < 0 ? 0 : r > 255 ? 255 : r;
        g = g < 0 ? 0 : g > 255 ? 255 : g;
        b = b < 0 ? 0 : b > 255 ? 255 : b;
        out[fi] = 0xFF000000 | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
    }
  };
  var _fi = 0;

  /* ================= 程序化世界生成（参考 Labyrinthos.js 的岛屿/生物群落思路） ================= */
  T.generateWorld = function (seed, opts) {
    opts = opts || {};
    var rng = N.mulberry32(seed);
    var sea = clamp(opts.sea != null ? opts.sea : 0.5, 0.05, 0.95);
    var forest = clamp(opts.forest != null ? opts.forest : 0.5, 0, 1);
    var mtn = clamp(opts.mountain != null ? opts.mountain : 0.35, 0, 1);
    var scale = clamp(opts.scale != null ? opts.scale : 1, 0.6, 1.8);
    var g = T.grid, GW = T.GW, GH = T.GH, i, x, y;
    g.fill(0);
    var s1 = rng() * 100, s2 = rng() * 100, s3 = rng() * 100, s4 = rng() * 100, s5 = rng() * 100;
    var N2 = T.GN;
    /* 高度场：域扭曲多倍频 FBM 直接写入 hgt */
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      i = y * GW + x;
      var u = x / GH, v = y / GH;
      var wx2 = fbm(u * 1.3 * scale + s2, v * 1.3 * scale + s3, 2) - 0.5;
      var wy2 = fbm(u * 1.3 * scale + s3 + 11.7, v * 1.3 * scale + s4 + 5.1, 2) - 0.5;
      T.hgt[i] = fbm((u + wx2 * 0.45) * 2.0 * scale + s1, (v + wy2 * 0.45) * 2.0 * scale + s2, 4);
    }
    /* 分位校准：滑杆直接控制陆地/山地占比 */
    var sortedH = Array.prototype.slice.call(T.hgt).sort(function (a, b) { return a - b; });
    var landFrac = 0.12 + sea * 0.6;
    var landT = sortedH[Math.min(N2 - 1, Math.floor(N2 * (1 - landFrac)))];
    var mtnFrac = mtn * 0.45;
    var mtnT = mtnFrac > 0.001 ? sortedH[Math.min(N2 - 1, Math.floor(N2 * Math.max(0, 1 - landFrac * mtnFrac)))] : 1e9;
    var lt = Math.max(1e-6, landT);
    var top = sortedH[N2 - 1];
    var rt = mtnT > 1e8 ? top : Math.max(lt + 1e-6, mtnT);
    var landMoist = [];
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      i = y * GW + x;
      if (T.hgt[i] >= landT) landMoist.push(fbm((x / GW) * 2.9 * scale + s5 + 37, (y / GH) * 2.9 * scale + s4 + 61, 3));
    }
    landMoist.sort(function (a, b) { return a - b; });
    var fT = landMoist.length ? landMoist[Math.min(landMoist.length - 1, Math.floor(landMoist.length * (1 - forest * 0.55)))] : 2;
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      i = y * GW + x;
      var e = T.hgt[i];
      if (e < landT) { T.hgt[i] = 0.04 + (e - sortedH[0]) / Math.max(1e-6, lt - sortedH[0]) * 0.10; continue; }
      /* 陆地高度映射到工具标尺 0.30~0.92 */
      T.hgt[i] = clamp(0.30 + (e - lt) / (top - lt) * 0.62, 0.2, 0.95);
      var moist = fbm((x / GW) * 2.9 * scale + s5 + 37, (y / GH) * 2.9 * scale + s4 + 61, 3);
      if (e >= mtnT) { g[i] = 3; continue; }
      g[i] = moist > fT ? 2 : 1;
    }
  };

  /* ================= 工程序列化（v2 含高度场；v1 旧档按类型合成） ================= */
  function quantH() {
    var h8 = new Uint8Array(T.GN), i, hv;
    for (i = 0; i < T.GN; i++) { hv = T.hgt[i]; h8[i] = hv < 0 ? 0 : hv > 1 ? 255 : (hv * 255) | 0; }
    return h8;
  }
  function b64(u8) {
    var bin = '', i;
    for (i = 0; i < u8.length; i += 4096) {
      bin += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + 4096, u8.length)));
    }
    return btoa(bin);
  }
  function unb64(s) { return atob(s); }
  function synthHeightFromTypes() {
    T.refreshDists();
    var g = T.grid, i, x, y;
    for (y = 0; y < T.GH; y++) for (x = 0; x < T.GW; x++) {
      i = y * T.GW + x;
      var v = g[i], jt = (vn(x * 0.13 + 7.1, y * 0.13 + 3.3) - 0.5) * 0.10;
      if (v === 0) T.hgt[i] = Math.max(0.02, 0.14 - Math.min(0.10, distWater[i] * 0.012));
      else if (v === 3) T.hgt[i] = 0.78 + jt;
      else if (v === 4) T.hgt[i] = 0.16 + jt * 0.4;
      else T.hgt[i] = 0.34 + jt;
    }
  }
  T.exportProject = function () {
    var g = T.grid, bin = '', i;
    for (i = 0; i < g.length; i += 4096) {
      bin += String.fromCharCode.apply(null, g.subarray(i, Math.min(i + 4096, g.length)));
    }
    return {
      app: 'teyvat-map-atelier', v: 2, gw: T.GW, gh: T.GH,
      palette: T.PALETTE_NAME,
      settings: JSON.parse(JSON.stringify(T.settings)),
      grid: b64(g),
      hgt: b64(quantH())
    };
  };
  T.importProject = function (obj) {
    if (!obj || obj.app !== 'teyvat-map-atelier' || !obj.grid) throw new Error('不是有效的地图工程文件');
    if (obj.gw !== T.GW || obj.gh !== T.GH) throw new Error('工程网格分辨率不符（' + obj.gw + '×' + obj.gh + '）');
    var bin = unb64(obj.grid), g = T.grid, i;
    for (i = 0; i < g.length; i++) g[i] = bin.charCodeAt(i) & 0xFF;
    if (obj.hgt) {
      var hb = unb64(obj.hgt);
      for (i = 0; i < T.GN && i < hb.length; i++) T.hgt[i] = (hb.charCodeAt(i) & 0xFF) / 255;
    } else {
      synthHeightFromTypes();
    }
    if (obj.settings) for (var k in T.settings) if (k in obj.settings) T.settings[k] = obj.settings[k];
    if (obj.palette && obj.palette !== T.PALETTE_NAME) T.applyPalette(obj.palette);
  };

  /* ================= 涂鸦与示例地图 ================= */
  T.stampGrid = function (gx, gy, r, id) {
    var GW = T.GW, GH = T.GH, g = T.grid;
    var R = Math.ceil(r), x0 = Math.round(gx), y0 = Math.round(gy);
    for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      var x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
      g[y * GW + x] = id;
    }
  };

  /* 笔刷同步写入高度（道路除外——道路贴附在地形上） */
  T.stampHeight = function (gx, gy, r, h) {
    var GW = T.GW, GH = T.GH;
    var R = Math.ceil(r), x0 = Math.round(gx), y0 = Math.round(gy);
    for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      var x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
      var hv = h + (vn(x * 0.13 + 7.1, y * 0.13 + 3.3) - 0.5) * 0.10;
      T.hgt[y * GW + x] = hv < 0.005 ? 0.005 : hv > 1 ? 1 : hv;
    }
  };

  /* 示例地图：坐标全部归一化，与网格分辨率无关 */
  T.loadDemo = function (seed) {
    var rng = N.mulberry32(seed);
    var g = T.grid, GW = T.GW, GH = T.GH;
    g.fill(0);
    T.hgt.fill(0.04);
    var HT = { 0: 0.05, 1: 0.34, 2: 0.36, 3: 0.78, 4: 0.16 };

    function blob(u, v, r, id, irr) {
      var cx = u * GW, cy = v * GH, rr = r * GH;
      var s = rng() * 50, R = Math.ceil(rr * (1 + irr) + 2), x0 = Math.round(cx), y0 = Math.round(cy);
      for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
        var x = x0 + dx, y = y0 + dy;
        if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
        var d = Math.hypot(dx, dy);
        if (d > rr * (1 + irr)) continue;
        var ang = Math.atan2(dy, dx);
        var wob = (vn(Math.cos(ang) * 1.7 + s, Math.sin(ang) * 1.7 + s) - 0.5) * 2;
        if (d < rr * (1 + wob * irr)) {
          g[y * GW + x] = id;
          T.hgt[y * GW + x] = HT[id] + (vn(x * 0.12 + s * 0.37, y * 0.12 + s * 0.11) - 0.5) * 0.07;
        }
      }
    }
    function roadLine(pts) {
      for (var k = 0; k < pts.length - 1; k++) {
        var x0 = pts[k][0] * GW, y0 = pts[k][1] * GH, x1 = pts[k + 1][0] * GW, y1 = pts[k + 1][1] * GH;
        var d = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(d / 1.4);
        var ph = rng() * 6.28, amp = 1.2 + rng() * 1.2, frq = 3 + rng() * 2;
        var nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
        for (var i = 0; i <= steps; i++) {
          var t = i / steps;
          var off = Math.sin(t * frq * Math.PI + ph) * amp * Math.sin(Math.PI * t);
          var wr = GH * 0.0085 * (0.75 + 0.5 * vn((x0 + (x1 - x0) * t) * 0.09, (y0 + (y1 - y0) * t) * 0.09));
          T.stampGrid(x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off, wr, 5);
        }
      }
    }

    /* 陆地 */
    blob(0.354, 0.533, 0.34, 1, 0.36);
    blob(0.188, 0.296, 0.126, 1, 0.42);
    blob(0.625, 0.237, 0.185, 1, 0.45);
    blob(0.771, 0.630, 0.215, 1, 0.40);
    blob(0.500, 0.704, 0.037, 1, 0.50);
    blob(0.896, 0.311, 0.052, 1, 0.50);
    blob(0.117, 0.756, 0.044, 1, 0.50);
    blob(0.500, 0.133, 0.044, 1, 0.50);
    /* 湖泊 */
    blob(0.396, 0.407, 0.059, 0, 0.40);
    blob(0.792, 0.681, 0.030, 0, 0.40);
    blob(0.250, 0.667, 0.026, 0, 0.40);
    /* 森林 */
    var forests = [
      [0.250, 0.444, 0.067], [0.313, 0.667, 0.059], [0.450, 0.607, 0.052],
      [0.583, 0.333, 0.074], [0.708, 0.533, 0.059], [0.825, 0.704, 0.052],
      [0.217, 0.385, 0.044], [0.417, 0.504, 0.037], [0.675, 0.356, 0.044]
    ];
    for (var f = 0; f < forests.length; f++) blob(forests[f][0], forests[f][1], forests[f][2], 2, 0.45);
    /* 山地 */
    blob(0.229, 0.311, 0.074, 3, 0.40);
    blob(0.625, 0.178, 0.037, 3, 0.40);
    blob(0.854, 0.519, 0.044, 3, 0.40);
    /* 道路 */
    roadLine([[0.467, 0.637], [0.400, 0.548], [0.300, 0.459], [0.208, 0.370]]);
    roadLine([[0.467, 0.637], [0.450, 0.474], [0.500, 0.370], [0.567, 0.296]]);
    roadLine([[0.708, 0.593], [0.771, 0.519], [0.825, 0.593], [0.792, 0.681], [0.708, 0.593]]);
    roadLine([[0.250, 0.385], [0.183, 0.326], [0.158, 0.252]]);
  };
})(window.GMM.Terrain = window.GMM.Terrain || {}, window.GMM);
