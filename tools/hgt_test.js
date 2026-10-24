// 高度场存档往返测试：node tools/hgt_test.js
global.window = global;
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
eval(fs.readFileSync(path.join(root, 'js', 'noise.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'js', 'terrain.js'), 'utf8'));
const T = window.GMM.Terrain;
T.loadDemo(20260241);
const proj = T.exportProject();
const hBefore = T.hgt.slice();
T.grid.fill(0); T.hgt.fill(0.5);
T.importProject(JSON.parse(JSON.stringify(proj)));
let ok = true;
for (let i = 0; i < T.GN; i++) if (Math.abs(T.hgt[i] - hBefore[i]) > 0.004) { ok = false; break; }
const old1 = { app: 'teyvat-map-atelier', v: 1, gw: T.GW, gh: T.GH, grid: proj.grid, settings: proj.settings };
T.importProject(old1);
let synthOK = true;
for (let i = 0; i < T.GN; i++) { const h = T.hgt[i]; if (!(h > 0 && h <= 1)) { synthOK = false; break; } }
console.log('v2 roundtrip hgt:', ok, '| v1 synth valid:', synthOK);
