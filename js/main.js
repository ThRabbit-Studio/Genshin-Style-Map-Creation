/* 应用入口：画布编排、UI、交互（GMM.App） */
(function (A, T, D, N) {
  "use strict";
  var clamp = N.clamp;
  var RW = T.RW, RH = T.RH;
  var root = document.getElementById('gmm-root');

  /* ================= 画布 ================= */
  var view = document.getElementById('gmm-view'), ctxM = view.getContext('2d');
  var cvF = document.createElement('canvas'); cvF.width = RW; cvF.height = RH;
  var ctxF = cvF.getContext('2d'), imgF = ctxF.createImageData(RW, RH);
  var cvH = document.createElement('canvas'); cvH.width = RW / 2; cvH.height = RH / 2;
  var ctxH = cvH.getContext('2d'), imgH = ctxH.createImageData(RW / 2, RH / 2);
  var haveFull = false;

  /* ================= 视图：缩放与平移 ================= */
  var cwrap = document.getElementById('gmm-cwrap');
  var vz = 1, vtx = 0, vty = 0;
  function applyView() {
    view.style.transformOrigin = '0 0';
    view.style.transform = 'translate(' + vtx + 'px,' + vty + 'px) scale(' + vz + ')';
  }
  function viewBase() {
    var wr = cwrap.getBoundingClientRect();
    var cs = getComputedStyle(cwrap);
    var bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
    var dw = wr.width - bl - (parseFloat(cs.borderRightWidth) || 0);
    return { bx: wr.left + bl, by: wr.top + bt, dw: dw, dh: dw * RH / RW };
  }
  function clampView() {
    var b = viewBase();
    var minX = Math.min(0, b.dw - b.dw * vz), maxX = Math.max(0, b.dw - b.dw * vz);
    var minY = Math.min(0, b.dh - b.dh * vz), maxY = Math.max(0, b.dh - b.dh * vz);
    vtx = Math.min(maxX, Math.max(minX, vtx));
    vty = Math.min(maxY, Math.max(minY, vty));
  }
  function zoomAt(clientX, clientY, factor) {
    var b = viewBase();
    var r = view.getBoundingClientRect();
    var mx = (clientX - r.left) / r.width * RW, my = (clientY - r.top) / r.height * RH;
    var nz = Math.min(4, Math.max(0.5, vz * factor));
    vtx = (clientX - b.bx) - mx / RW * b.dw * nz;
    vty = (clientY - b.by) - my / RH * b.dh * nz;
    vz = nz;
    clampView(); applyView();
  }
  cwrap.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });
  document.getElementById('gmm-zin').addEventListener('click', function () {
    var b = viewBase(); zoomAt(b.bx + b.dw / 2, b.by + b.dh / 2, 1.25);
  });
  document.getElementById('gmm-zout').addEventListener('click', function () {
    var b = viewBase(); zoomAt(b.bx + b.dw / 2, b.by + b.dh / 2, 1 / 1.25);
  });
  document.getElementById('gmm-zfit').addEventListener('click', function () {
    vz = 1; vtx = 0; vty = 0; applyView();
  });

  var FF = null, FH = null;
  function renderTerrain(res) {
    if (res === 'full') { T.renderMap(FF, imgF); ctxF.putImageData(imgF, 0, 0); haveFull = true; }
    else { T.renderMap(FH, imgH); ctxH.putImageData(imgH, 0, 0); haveFull = false; }
  }

  /* ================= 装饰物数据 ================= */
  var decors = [];
  var selected = null;
  var mctx = document.createElement('canvas').getContext('2d');
  function labelW(d) {
    mctx.font = '600 ' + (30 * d.scale) + 'px "Teyvat UI","Microsoft YaHei",sans-serif';
    return mctx.measureText(d.text || '未命名').width;
  }
  function drawLabel(ctx, d) {
    var text = d.text || '未命名';
    var size = 30 * d.scale;
    ctx.font = '600 ' + size + 'px "Teyvat UI","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.18;
    ctx.strokeStyle = 'rgba(42,34,22,0.88)';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#f7edd2';
    ctx.fillText(text, 0, 0);
  }
  function drawDecors(ctx) {
    decors.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < decors.length; i++) {
      var d = decors[i];
      if (!D.DEFS[d.type]) continue;
      if (d.type === 'label') {
        if (!T.settings.showLabels) continue;
      } else {
        var dcat = D.DEFS[d.type].cat;
        if (!T.settings.showCat || T.settings.showCat[dcat] === false) continue;
      }
      ctx.save();
      ctx.translate(d.x, d.y);
      if (d.rot) ctx.rotate(d.rot);
      ctx.scale(d.scale, d.scale);
      if (d.type === 'label') { ctx.scale(1 / d.scale, 1 / d.scale); drawLabel(ctx, d); }
      else D.DEFS[d.type].draw(ctx, d);
      ctx.restore();
      if (d === selected) {
        ctx.save(); ctx.translate(d.x, d.y);
        var rr = d.type === 'label' ? labelW(d) / 2 + 12 : D.DEFS[d.type].hit * d.scale + 8;
        ctx.strokeStyle = '#8ce8f2'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.283); ctx.stroke();
        ctx.restore();
      }
    }
  }
  function pickDecor(p) {
    for (var i = decors.length - 1; i >= 0; i--) {
      var d = decors[i];
      if (d.type === 'label') {
        if (Math.abs(p.x - d.x) < labelW(d) / 2 + 8 && Math.abs(p.y - d.y) < 18 * d.scale + 6) return d;
      } else if (Math.hypot(p.x - d.x, p.y - d.y) < D.DEFS[d.type].hit * d.scale + 4) return d;
    }
    return null;
  }

  function composite() {
    ctxM.drawImage(haveFull ? cvF : cvH, 0, 0, RW, RH);
    drawDecors(ctxM);
  }
  function renderFullNow() { renderTerrain('full'); composite(); scheduleAutosave(); }
  var rafPending = false;
  function requestPreview() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () { rafPending = false; renderTerrain('half'); composite(); });
  }

  /* ================= 撤销 / 重做与自动保存 ================= */
  var undoStack = [], redoStack = [];
  var autosaveTimer = null, booted = false;
  function currentProject() {
    var proj = T.exportProject();
    proj.decors = decors;
    return proj;
  }
  function scheduleAutosave() {
    if (!booted) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      try { localStorage.setItem('teyvat-map-autosave', JSON.stringify(currentProject())); } catch (err) {}
    }, 800);
  }
  function takeSnap() {
    var h8 = new Uint8Array(T.GN), i, hv;
    for (i = 0; i < T.GN; i++) { hv = T.hgt[i]; h8[i] = hv < 0 ? 0 : hv > 1 ? 255 : (hv * 255) | 0; }
    return { p: T.grid.slice(), h: h8, d: JSON.stringify(decors) };
  }
  function restoreState(s) {
    T.grid.set(s.p);
    if (s.h) for (var i = 0; i < T.GN; i++) T.hgt[i] = s.h[i] / 255;
    decors = JSON.parse(s.d);
    selected = null;
    renderFullNow(); updateHint(); updateLayerCounts();
  }
  function pushUndo() {
    undoStack.push(takeSnap());
    if (undoStack.length > 30) undoStack.shift();
    redoStack.length = 0;
    scheduleAutosave();
    updateLayerCounts();
  }
  function doUndo() {
    var s = undoStack.pop();
    if (!s) { toast('没有可撤销的操作'); return; }
    redoStack.push(takeSnap());
    restoreState(s);
  }
  function doRedo() {
    var s = redoStack.pop();
    if (!s) { toast('没有可重做的操作'); return; }
    undoStack.push(takeSnap());
    restoreState(s);
  }

  /* ================= 地形绘制 ================= */
  var curTool = 1, brushSize = 7;
  function loadDemoAll(seed) {
    T.loadDemo(seed);
    demoDecors(seed);
  }  /* 示例地图的装饰布局（归一化坐标） */
  function demoDecors(seed) {
    var rng = N.mulberry32(seed ^ 0x9E3779B9);
    decors = []; selected = null;
    function add(t, u, v, s, rot) { decors.push({ type: t, x: u * RW, y: v * RH, scale: s, rot: rot || 0 }); }
    add('cathedral', 0.467, 0.578, 1.25);
    add('village', 0.535, 0.700, 1.0);
    add('wall', 0.432, 0.610, 1.0);
    add('wall', 0.508, 0.606, 1.0);
    add('bridge', 0.537, 0.425, 1.0);
    add('house', 0.442, 0.622, 1.1); add('house', 0.492, 0.622, 1.05); add('house', 0.433, 0.674, 1.0);
    add('house', 0.488, 0.674, 1.1); add('house', 0.458, 0.726, 0.95);
    add('tavern', 0.517, 0.652, 1.15); add('windmill', 0.413, 0.607, 1.1);
    add('dock', 0.467, 0.793, 1.0);
    add('tower', 0.250, 0.267, 1.1);
    add('waypoint', 0.396, 0.519, 1); add('waypoint', 0.771, 0.652, 1);
    add('statue', 0.292, 0.578, 1);
    add('ruins', 0.583, 0.333, 1.1); add('ruins', 0.817, 0.430, 0.9);
    add('camp', 0.667, 0.444, 1); add('camp', 0.854, 0.741, 0.9);
    var trees = [
      [0.292, 0.407], [0.271, 0.504], [0.342, 0.533], [0.375, 0.630], [0.417, 0.711],
      [0.542, 0.548], [0.608, 0.504], [0.654, 0.407], [0.700, 0.630], [0.742, 0.711],
      [0.792, 0.578], [0.150, 0.341], [0.217, 0.459], [0.563, 0.311], [0.396, 0.326],
      [0.667, 0.296], [0.517, 0.756], [0.842, 0.652], [0.483, 0.685], [0.452, 0.700]
    ];
    for (var i = 0; i < trees.length; i++) add('tree', trees[i][0], trees[i][1], 0.9 + rng() * 0.4, (rng() - 0.5) * 0.4);
    var fruits = [[0.460, 0.645], [0.500, 0.648]];
    for (var i5 = 0; i5 < fruits.length; i5++) add('fruit', fruits[i5][0], fruits[i5][1], 0.9 + rng() * 0.3, (rng() - 0.5) * 0.3);
    var pines = [[0.217, 0.267], [0.242, 0.252], [0.200, 0.326], [0.617, 0.148], [0.638, 0.222], [0.258, 0.267]];
    for (var j = 0; j < pines.length; j++) add('pine', pines[j][0], pines[j][1], 0.9 + rng() * 0.3, (rng() - 0.5) * 0.3);
    var rocks = [[0.267, 0.370], [0.817, 0.459], [0.425, 0.385]];
    for (var k = 0; k < rocks.length; k++) add('rock', rocks[k][0], rocks[k][1], 0.8 + rng() * 0.4, (rng() - 0.5) * 0.6);
  }
  var H_TARGET = { 0: 0.04, 1: 0.34, 2: 0.36, 3: 0.80, 4: 0.16 };
  function stampAt(p) {
    var gx = p.x * T.GW / RW, gy = p.y * T.GH / RH;
    var r = brushSize;
    if (curTool === 5) {
      /* 道路：宽度随位置噪声起伏，避免均匀圆头笔触 */
      r = Math.max(1, brushSize * 0.45 * (0.72 + 0.56 * N.vn(gx * 0.12 + 3.7, gy * 0.12 + 9.2)));
    } else {
      /* 非道路笔刷同步写高度：山地隆起、草林缓丘、沙滩压低（道路贴附地形不改动） */
      T.stampHeight(gx, gy, r, H_TARGET[curTool]);
    }
    T.stampGrid(gx, gy, r, curTool);
  }
  function stampLine(a, b) {
    var gx1 = a.x * T.GW / RW, gy1 = a.y * T.GH / RH, gx2 = b.x * T.GW / RW, gy2 = b.y * T.GH / RH;
    var d = Math.hypot(gx2 - gx1, gy2 - gy1);
    var steps = Math.max(1, Math.ceil(d / (brushSize * 0.5)));
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      stampAt({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }

  /* ================= UI ================= */
  var toastEl = document.getElementById('gmm-toast'), toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }
  var hintEl = document.getElementById('gmm-hint');
  function updateHint() {
    if (mode === 'terrain') {
      var name = TERRAINS.filter(function (t) { return t.id === curTool; })[0].name;
      hintEl.textContent = '在地图上按住拖拽即可绘制「' + name + '」— 海洋也可当作橡皮擦；海岸沙滩与浅滩会自动生成';
    } else if (mode === 'render') {
      hintEl.textContent = '渲染设置：自动沙滩 / 浅滩层的宽度与开关、海岸描边、悬崖立体感、等高线与手绘扭曲强度均可调整';
    } else if (scatterMode) {
      hintEl.textContent = '散布植被笔刷：按住拖拽，随机撒下大小角度各异的树木 / 草丛 / 碎石';
    } else if (delMode) {
      hintEl.textContent = '删除模式：点击装饰物即可移除';
    } else {
      hintEl.textContent = '点击地面放置「' + D.DEFS[curDecor].name + '」· 拖拽可移动 · Delete 删除选中 · 右键快速移除';
    }
  }

  var TERRAINS = [
    { id: 0, name: '海洋', c1: '#2a849c', c2: '#68c8d4' },
    { id: 1, name: '草地', c1: '#7f9348', c2: '#bcc973' },
    { id: 2, name: '森林', c1: '#47662e', c2: '#77954a' },
    { id: 3, name: '山地', c1: '#6f7674', c2: '#aeb3b1' },
    { id: 4, name: '沙滩', c1: '#c9ad72', c2: '#eeddab' },
    { id: 5, name: '道路', c1: '#a98e5e', c2: '#eeddab' }
  ];
  var tgrid = document.getElementById('gmm-tgrid');
  TERRAINS.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'gmm-tbtn' + (t.id === curTool ? ' on' : '');
    b.innerHTML = '<span class="gmm-sw" style="background:linear-gradient(135deg,' + t.c2 + ' 45%,' + t.c1 + ' 45%)"></span>' + t.name;
    b.addEventListener('click', function () {
      curTool = t.id;
      Array.prototype.forEach.call(tgrid.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      setMode('terrain'); updateHint();
    });
    tgrid.appendChild(b);
  });

  /* ================= 程序化世界生成（参考 Labyrinthos.js 思路） ================= */
  (function () {
    var wrap = document.getElementById('gmm-genwrap');
    if (!wrap) return;
    var G = { sea: 0.5, forest: 0.5, mountain: 0.35, scale: 1 };
    var sec = document.createElement('div'); sec.className = 'gmm-sec'; sec.textContent = '程序化生成';
    wrap.appendChild(sec);
    function grange(label, key, min, max, step) {
      var box = document.createElement('div'); box.className = 'gmm-slider';
      var lab = document.createElement('label');
      var sp = document.createElement('span'); sp.textContent = label;
      var b = document.createElement('b'); b.textContent = G[key];
      lab.appendChild(sp); lab.appendChild(b);
      var inp = document.createElement('input'); inp.type = 'range';
      inp.min = min; inp.max = max; inp.step = step; inp.value = G[key];
      inp.setAttribute('aria-label', label);
      inp.addEventListener('input', function () { G[key] = +inp.value; b.textContent = inp.value; });
      box.appendChild(lab); box.appendChild(inp);
      wrap.appendChild(box);
    }
    grange('海平面', 'sea', 0.05, 0.95, 0.05);
    grange('森林密度', 'forest', 0, 1, 0.05);
    grange('山地占比', 'mountain', 0, 1, 0.05);
    grange('地貌规模', 'scale', 0.6, 1.8, 0.1);
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gmm-btn';
    btn.style.marginTop = '8px'; btn.textContent = '🎲 生成世界';
    btn.addEventListener('click', function () {
      pushUndo();
      T.generateWorld((Math.random() * 1e9) | 0, G);
      selected = null;
      renderFullNow();
      updateLayerCounts();
      toast('已生成新世界（装饰物保留）');
    });
    wrap.appendChild(btn);
  })();

  /* 地名标注（文字图层） */
  D.DEFS.label = {
    name: '地名标注', cat: '地标', hit: 30,
    draw: function (c) {
      c.font = '26px "Teyvat UI","Microsoft YaHei",sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = '#4a3a26';
      c.strokeText('文', 0, 2);
      c.fillStyle = '#f2e8d2'; c.fillText('文', 0, 2);
    }
  };

  var CATS = ['建筑', '自然', '地标'];
  var dwrap = document.getElementById('gmm-dwrap');
  var curDecor = 'house', delMode = false, scatterMode = false, scatterBtn = null, mode = 'terrain', decoScale = 1;
  var delBtn = null;
  function clearDecorSel() {
    Array.prototype.forEach.call(root.querySelectorAll('.gmm-dbtn'), function (x) { x.classList.remove('on'); });
  }
  /* 图层树（分组勾选 + 计数，参考 Leaflet 图层控制） */
  var layerList = null;
  function updateLayerCounts() {
    if (!layerList) return;
    var S = T.settings;
    if (!S.showCat) S.showCat = { 建筑: true, 自然: true, 地标: true };
    var counts = { 建筑: 0, 自然: 0, 地标: 0 }, labels = 0;
    for (var i = 0; i < decors.length; i++) {
      var d = decors[i];
      if (d.type === 'label') labels++;
      else { var def = D.DEFS[d.type]; if (def && def.cat in counts) counts[def.cat]++; }
    }
    layerList.innerHTML = '';
    function row(name, count, checked, onToggle) {
      var lab = document.createElement('label'); lab.className = 'gmm-check';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!checked;
      var sp = document.createElement('span'); sp.textContent = name;
      var b = document.createElement('span'); b.className = 'gmm-cval'; b.textContent = '×' + count;
      lab.appendChild(cb); lab.appendChild(sp); lab.appendChild(b);
      cb.addEventListener('change', function () { onToggle(cb.checked); renderFullNow(); scheduleAutosave(); });
      layerList.appendChild(lab);
    }
    CATS.forEach(function (cat) {
      row(cat, counts[cat], S.showCat[cat] !== false, function (v) { S.showCat[cat] = v; });
    });
    row('文字标注', labels, S.showLabels, function (v) { S.showLabels = v; });
  }
  (function () {
    var sec = document.createElement('div'); sec.className = 'gmm-sec'; sec.textContent = '图层';
    dwrap.appendChild(sec);
    layerList = document.createElement('div');
    dwrap.appendChild(layerList);
  })();
  CATS.forEach(function (cat) {
    var sec = document.createElement('div'); sec.className = 'gmm-sec'; sec.textContent = cat; dwrap.appendChild(sec);
    var grid = document.createElement('div'); grid.className = 'gmm-dgrid'; dwrap.appendChild(grid);
    Object.keys(D.DEFS).forEach(function (key) {
      var def = D.DEFS[key];
      if (def.cat !== cat) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gmm-dbtn' + (key === curDecor ? ' on' : '');
      var cv = document.createElement('canvas'); cv.width = 44; cv.height = 44;
      var ic = cv.getContext('2d');
      ic.translate(22, 31); ic.scale(0.62, 0.62); def.draw(ic);
      b.appendChild(cv);
      var sp = document.createElement('span'); sp.textContent = def.name; b.appendChild(sp);
      b.addEventListener('click', function () {
        curDecor = key;
        if (delBtn) delBtn.classList.remove('on');
        if (scatterBtn) scatterBtn.classList.remove('on');
        delMode = false; scatterMode = false;
        clearDecorSel(); b.classList.add('on');
        setMode('decor'); updateHint();
      });
      grid.appendChild(b);
    });
  });
  (function () {
    var dsec = document.createElement('div'); dsec.className = 'gmm-sec'; dsec.textContent = '操作'; dwrap.appendChild(dsec);
    var grid = document.createElement('div'); grid.className = 'gmm-dgrid'; dwrap.appendChild(grid);
    function toolButton(cls, label, iconFn) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'gmm-dbtn ' + cls;
      b.style.gridColumn = '1 / -1';
      var cv = document.createElement('canvas'); cv.width = 30; cv.height = 26;
      iconFn(cv.getContext('2d'));
      cv.style.width = '26px'; cv.style.height = '22px';
      b.appendChild(cv);
      var sp = document.createElement('span'); sp.textContent = label; b.appendChild(sp);
      grid.appendChild(b);
      return b;
    }
    delBtn = toolButton('del', '点击装饰移除', function (ic) {
      ic.translate(15, 13);
      ic.strokeStyle = '#d84a3a'; ic.lineWidth = 3.5; ic.lineCap = 'round';
      ic.beginPath(); ic.moveTo(-6, -6); ic.lineTo(6, 6); ic.moveTo(6, -6); ic.lineTo(-6, 6); ic.stroke();
    });
    delBtn.addEventListener('click', function () {
      delMode = !delMode;
      delBtn.classList.toggle('on', delMode);
      if (delMode) { scatterMode = false; scatterBtn.classList.remove('on'); clearDecorSel(); }
      updateHint();
    });
    scatterBtn = toolButton('sct', '散布植被笔刷', function (ic) {
      ic.fillStyle = '#5c8a46';
      ic.beginPath(); ic.arc(7, 15, 4, 0, 7); ic.fill();
      ic.beginPath(); ic.arc(15, 9, 5, 0, 7); ic.fill();
      ic.beginPath(); ic.arc(24, 16, 3.5, 0, 7); ic.fill();
      ic.fillStyle = '#79a851';
      ic.beginPath(); ic.arc(13, 7, 2, 0, 7); ic.fill();
      ic.beginPath(); ic.arc(18, 13, 2, 0, 7); ic.fill();
    });
    scatterBtn.addEventListener('click', function () {
      scatterMode = !scatterMode;
      scatterBtn.classList.toggle('on', scatterMode);
      if (scatterMode) { delMode = false; delBtn.classList.remove('on'); clearDecorSel(); }
      updateHint();
    });
  })();

  function rebuildFields() {
    FF = T.makeFields(RW, RH);
    FH = T.makeFields(RW / 2, RH / 2);
    renderFullNow();
  }
  function setMode(m) {
    mode = m;
    document.getElementById('gmm-tab-t').setAttribute('aria-selected', m === 'terrain' ? 'true' : 'false');
    document.getElementById('gmm-tab-d').setAttribute('aria-selected', m === 'decor' ? 'true' : 'false');
    document.getElementById('gmm-tab-r').setAttribute('aria-selected', m === 'render' ? 'true' : 'false');
    document.getElementById('gmm-panel-t').hidden = (m !== 'terrain');
    document.getElementById('gmm-panel-d').hidden = (m !== 'decor');
    document.getElementById('gmm-panel-r').hidden = (m !== 'render');
    view.style.cursor = m === 'terrain' ? 'crosshair' : (m === 'decor' && !delMode ? 'pointer' : 'default');
  }
  document.getElementById('gmm-tab-t').addEventListener('click', function () { setMode('terrain'); updateHint(); });
  document.getElementById('gmm-tab-d').addEventListener('click', function () { setMode('decor'); updateHint(); });
  document.getElementById('gmm-tab-r').addEventListener('click', function () { setMode('render'); updateHint(); });

  var bsize = document.getElementById('gmm-bsize'), bsizeV = document.getElementById('gmm-bsize-v');
  bsize.addEventListener('input', function () { brushSize = +bsize.value; bsizeV.textContent = bsize.value; });
  var dscale = document.getElementById('gmm-dscale'), dscaleV = document.getElementById('gmm-dscale-v');
  dscale.addEventListener('input', function () { decoScale = +dscale.value; dscaleV.textContent = decoScale.toFixed(1); });

  /* ================= 渲染设置面板 ================= */
  var renderSync = [];
  function syncRenderPanel() { renderSync.forEach(function (fn) { fn(); }); }
  (function () {
    var wrap = document.getElementById('gmm-rwrap');
    var S = T.settings;
    function addCheck(label, key) {
      var lab = document.createElement('label'); lab.className = 'gmm-check';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!S[key];
      var sp = document.createElement('span'); sp.textContent = label;
      lab.appendChild(cb); lab.appendChild(sp);
      cb.addEventListener('change', function () { S[key] = cb.checked; renderFullNow(); scheduleAutosave(); });
      wrap.appendChild(lab);
      renderSync.push(function () { cb.checked = !!S[key]; });
    }
    function addRange(label, key, min, max, step, onChange) {
      var box = document.createElement('div'); box.className = 'gmm-slider gmm-sub';
      var lab = document.createElement('label');
      var sp = document.createElement('span'); sp.textContent = label;
      var b = document.createElement('b'); b.textContent = S[key];
      lab.appendChild(sp); lab.appendChild(b);
      var inp = document.createElement('input'); inp.type = 'range';
      inp.min = min; inp.max = max; inp.step = step; inp.value = S[key];
      inp.setAttribute('aria-label', label);
      inp.addEventListener('change', function () {
        S[key] = +inp.value; b.textContent = inp.value;
        if (onChange) onChange(); else renderFullNow();
        scheduleAutosave();
      });
      box.appendChild(lab); box.appendChild(inp);
      wrap.appendChild(box);
      renderSync.push(function () { inp.value = S[key]; b.textContent = S[key]; });
    }
    addCheck('自动沙滩层', 'beach');
    addRange('沙滩宽度', 'beachW', 0, 6, 0.2);
    addCheck('自动浅滩层', 'shallow');
    addRange('浅滩宽度', 'shallowW', 0, 5, 0.2);
    addRange('海岸描边强度', 'outline', 0, 2, 0.5);    addRange('悬崖立体感', 'cliff', 0, 2, 0.5);
    addCheck('等高线纹理', 'contours');
    addRange('等高线密度', 'cLevels', 3, 12, 1);
    addRange('色块纹理强度', 'texture', 0.5, 2, 0.1);
    addRange('手绘扭曲强度', 'warpScale', 0.4, 2, 0.1, function () { rebuildFields(); });
  })();

  /* ================= 地区风格色板 ================= */
  (function () {
    var wrap = document.getElementById('gmm-pals');
    var chips = {};
    var meta = {
      mond:    { name: '蒙德', chip: 'linear-gradient(135deg,#68c8d4 45%,#96aa55 45%)' },
      liyue:   { name: '璃月', chip: 'linear-gradient(135deg,#74ccc4 45%,#b0b858 45%)' },
      inazuma: { name: '稻妻', chip: 'linear-gradient(135deg,#78c4d8 45%,#929664 45%)' },
      chasm:   { name: '层岩', chip: 'linear-gradient(135deg,#5ca8b6 45%,#7a8848 45%)' }
    };
    var mk = function (key) {
      return function () {
        if (!T.applyPalette(key)) return;
        Object.keys(chips).forEach(function (k) { chips[k].classList.toggle('on', k === key); });
        renderFullNow(); scheduleAutosave();
        toast('已切换到「' + meta[key].name + '」配色');
      };
    };
    Object.keys(meta).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gmm-pal' + (T.PALETTE_NAME === key ? ' on' : '');
      b.innerHTML = '<span class="gmm-pal-chip" style="background:' + meta[key].chip + '"></span><span>' + meta[key].name + '</span>';
      b.addEventListener('click', mk(key));
      chips[key] = b;
      wrap.appendChild(b);
    });
    renderSync.push(function () {
      Object.keys(chips).forEach(function (k) { chips[k].classList.toggle('on', k === T.PALETTE_NAME); });
    });
  })();

  /* ================= 画布交互 ================= */
  var drawing = false, lastP = null, dragD = null, dragOff = null;
  var panning = false, panStart = null, spaceDown = false;
  var scribing = false, sLast = null;
  function evtPos(e) {
    var r = view.getBoundingClientRect();
    return { x: (e.clientX - r.left) * RW / r.width, y: (e.clientY - r.top) * RH / r.height };
  }
  var scatterPool = ['tree', 'tree', 'pine', 'pine', 'fruit', 'tuft', 'tuft', 'tuft', 'stone_s', 'stone_s', 'rock'];
  function scatterAt(p) {
    var radius = brushSize * 3.2, n = 1 + (Math.random() < 0.6 ? 1 : 0);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * radius;
      var type = scatterPool[(Math.random() * scatterPool.length) | 0];
      if (!D.DEFS[type]) type = 'tree'; /* 新资产尚未就绪时回退 */
      decors.push({
        type: type,
        x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d,
        scale: 0.35 + Math.random() * 0.45,
        rot: (Math.random() - 0.5) * 0.9
      });
    }
  }
  var compPending = false;
  function requestComposite() {
    if (compPending) return;
    compPending = true;
    requestAnimationFrame(function () {
      compPending = false;
      if (!haveFull) renderTerrain('full');
      composite();
    });
  }
  view.addEventListener('pointerdown', function (e) {
    if (e.button === 2 || mode === 'render') return;
    if (e.button === 1 || (spaceDown && e.button === 0)) {
      panning = true;
      panStart = { cx: e.clientX, cy: e.clientY, tx: vtx, ty: vty };
      try { view.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
      return;
    }
    var p = evtPos(e);
    try { view.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件等无活动指针时忽略 */ }
    if (mode === 'terrain') {
      pushUndo(); drawing = true; lastP = p; stampAt(p); requestPreview();
    } else if (scatterMode) {
      pushUndo(); scribing = true; sLast = p; scatterAt(p); requestComposite();
    } else if (delMode) {
      var hit = pickDecor(p);
      if (hit) {
        pushUndo(); decors.splice(decors.indexOf(hit), 1);
        if (selected === hit) selected = null;
        renderFullNow();
      }
    } else {
      var hit2 = pickDecor(p);
      if (hit2) {
        pushUndo(); dragD = hit2; selected = hit2;
        dragOff = { x: p.x - hit2.x, y: p.y - hit2.y };
      } else if (curDecor === 'label') {
        openLabelModal({ at: p });
      } else {
        pushUndo();
        var rot = 0;
        if (curDecor === 'tree' || curDecor === 'pine' || curDecor === 'rock' || curDecor === 'fruit') rot = (Math.random() - 0.5) * 0.5;
        var d = { type: curDecor, x: p.x, y: p.y, scale: decoScale, rot: rot };
        decors.push(d); selected = d;
        if (!haveFull) renderTerrain('full');
        composite();
      }
    }
    e.preventDefault();
  });
  view.addEventListener('pointermove', function (e) {
    var p = evtPos(e);
    updateCursor(e, p);
    if (panning) {
      vtx = panStart.tx + (e.clientX - panStart.cx);
      vty = panStart.ty + (e.clientY - panStart.cy);
      clampView(); applyView();
      return;
    }
    if (drawing) {
      stampLine(lastP, p); lastP = p; requestPreview();
    } else if (scribing) {
      if (Math.hypot(p.x - sLast.x, p.y - sLast.y) > 14) { scatterAt(p); sLast = p; requestComposite(); }
    } else if (dragD) {
      dragD.x = p.x - dragOff.x; dragD.y = p.y - dragOff.y;
      if (!haveFull) renderTerrain('full');
      composite();
    }
  });
  function endStroke() {
    if (drawing) { drawing = false; lastP = null; renderFullNow(); }
    if (scribing) { scribing = false; sLast = null; renderFullNow(); }
    if (dragD) { dragD = null; renderFullNow(); }
  }
  view.addEventListener('pointerup', function (e) {
    if (panning) { panning = false; return; }
    endStroke();
  });
  view.addEventListener('pointercancel', function () {
    panning = false;
    endStroke();
  });
  view.addEventListener('pointerleave', function () {
    cursorEl.style.display = 'none';
    if (drawing) endStroke();
  });
  view.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    if (mode === 'decor') {
      var hit = pickDecor(evtPos(e));
      if (hit) {
        pushUndo(); decors.splice(decors.indexOf(hit), 1);
        if (selected === hit) selected = null;
        renderFullNow();
      }
    }
  });

  var cursorEl = document.getElementById('gmm-cursor');
  function updateCursor(e, p) {
    if (mode !== 'terrain' || spaceDown) { cursorEl.style.display = 'none'; return; }
    var r = view.getBoundingClientRect();
    var wr = cwrap.getBoundingClientRect();
    var cs = getComputedStyle(cwrap);
    var bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
    var px = brushSize * 2 * (r.width / T.GW) * (curTool === 5 ? 0.45 : 1);
    cursorEl.style.display = 'block';
    cursorEl.style.width = px + 'px'; cursorEl.style.height = px + 'px';
    cursorEl.style.left = (r.left - wr.left - bl + (p.x / RW) * r.width) + 'px';
    cursorEl.style.top = (r.top - wr.top - bt + (p.y / RH) * r.height) + 'px';
  }

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
      spaceDown = true;
      if (mode === 'terrain') view.style.cursor = 'grab';
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault(); doRedo(); return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selected) {
        pushUndo(); decors.splice(decors.indexOf(selected), 1);
        selected = null; renderFullNow();
      }
      return;
    }
    if (e.key === '[') { bsize.value = Math.max(2, +bsize.value - 1); bsize.dispatchEvent(new Event('input')); }
    if (e.key === ']') { bsize.value = Math.min(16, +bsize.value + 1); bsize.dispatchEvent(new Event('input')); }
    if (e.key === 'Escape') {
      selected = null; composite();
      document.getElementById('gmm-modal').hidden = true;
      closeLabelModal();
    }
  });
  document.addEventListener('keyup', function (e) {
    if (e.code === 'Space') {
      spaceDown = false;
      if (mode === 'terrain') view.style.cursor = 'crosshair';
    }
  });

  /* ================= 顶部按钮 ================= */
  document.getElementById('gmm-undo').addEventListener('click', doUndo);
  document.getElementById('gmm-redo').addEventListener('click', doRedo);
  document.getElementById('gmm-clear').addEventListener('click', function () {
    pushUndo(); T.grid.fill(0); decors = []; selected = null;
    renderFullNow(); toast('已清空（可撤销）');
  });
  document.getElementById('gmm-demo').addEventListener('click', function () {
    pushUndo(); loadDemoAll((Math.random() * 1e9) | 0);
    renderFullNow(); toast('已生成新的示例地图');
  });
  document.getElementById('gmm-export').addEventListener('click', function () {
    var url = view.toDataURL('image/png');
    document.getElementById('gmm-export-img').src = url;
    document.getElementById('gmm-dl').href = url;
    document.getElementById('gmm-modal').hidden = false;
  });
  document.getElementById('gmm-modal-close').addEventListener('click', function () {
    document.getElementById('gmm-modal').hidden = true;
  });
  document.getElementById('gmm-modal').addEventListener('click', function (e) {
    if (e.target === this) this.hidden = true;
  });

  /* ================= 地名标注 ================= */
  var labelModal = document.getElementById('gmm-label-modal');
  var labelInput = document.getElementById('gmm-label-input');
  var editingLabel = null, pendingLabel = null;
  function openLabelModal(opts) {
    editingLabel = opts.edit || null;
    pendingLabel = opts.at || null;
    labelInput.value = opts.text || '';
    labelModal.hidden = false;
    setTimeout(function () { labelInput.focus(); labelInput.select(); }, 30);
  }
  function closeLabelModal() {
    labelModal.hidden = true;
    editingLabel = null; pendingLabel = null;
  }
  function confirmLabel() {
    var text = labelInput.value.trim() || '未命名';
    if (editingLabel) {
      pushUndo(); editingLabel.text = text;
    } else if (pendingLabel) {
      pushUndo();
      var d = { type: 'label', x: pendingLabel.x, y: pendingLabel.y, scale: decoScale, rot: 0, text: text };
      decors.push(d); selected = d;
    }
    closeLabelModal();
    if (!haveFull) renderTerrain('full');
    composite(); scheduleAutosave();
  }
  document.getElementById('gmm-label-ok').addEventListener('click', confirmLabel);
  document.getElementById('gmm-label-cancel').addEventListener('click', closeLabelModal);
  labelModal.addEventListener('click', function (e) { if (e.target === this) closeLabelModal(); });
  labelInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') confirmLabel();
    if (e.key === 'Escape') closeLabelModal();
  });
  view.addEventListener('dblclick', function (e) {
    if (mode !== 'decor') return;
    var hit = pickDecor(evtPos(e));
    if (hit && hit.type === 'label') openLabelModal({ text: hit.text, edit: hit });
  });

  /* ================= 工程存档 ================= */
  document.getElementById('gmm-savep').addEventListener('click', function () {
    try {
      var blob = new Blob([JSON.stringify(currentProject())], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'my-map.teyvat.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      toast('工程已导出（.teyvat.json）');
    } catch (err) { toast('导出失败：' + err.message); }
  });
  document.getElementById('gmm-loadp').addEventListener('click', function () {
    document.getElementById('gmm-file').click();
  });
  document.getElementById('gmm-file').addEventListener('change', function (e) {
    var f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var proj = JSON.parse(fr.result);
        pushUndo();
        T.importProject(proj);
        decors = Array.isArray(proj.decors) ? proj.decors : [];
        selected = null;
        syncRenderPanel();
        renderFullNow();
        toast('工程已载入');
      } catch (err) { toast('载入失败：' + err.message); }
    };
    fr.readAsText(f);
  });

  /* ================= 启动 ================= */
  FF = T.makeFields(RW, RH);
  FH = T.makeFields(RW / 2, RH / 2);
  var restored = false;
  try {
    var savedRaw = localStorage.getItem('teyvat-map-autosave');
    if (savedRaw) {
      var savedProj = JSON.parse(savedRaw);
      T.importProject(savedProj);
      decors = Array.isArray(savedProj.decors) ? savedProj.decors : [];
      restored = true;
    }
  } catch (err) { restored = false; }
  if (restored) {
    renderFullNow(); syncRenderPanel();
    setTimeout(function () { toast('已恢复上次编辑的地图'); }, 200);
  } else {
    loadDemoAll(20260241);
    renderFullNow();
  }
  booted = true;
  setMode('terrain');
  updateHint();
  updateLayerCounts();
})(window.GMM.App = window.GMM.App || {}, window.GMM.Terrain, window.GMM.Decor, window.GMM);
