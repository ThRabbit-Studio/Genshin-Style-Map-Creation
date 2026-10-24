# 提瓦特地图工坊 · 交接文档（HANDOFF）

> 最后更新：2026-10-24 · 版本：v0.4（P0 地形地基完成）
> 预览：`python tools/serve.py` → http://127.0.0.1:8932

## 1. 这是什么

原神风格的手绘地图**制作器**（不是查看器）：用户用画笔涂地形、摆装饰、写字，程序实时渲染成手绘质感地图并导出 PNG。纯静态前端，零依赖、零构建，全部逻辑在浏览器本地运行。

当前完成度：P0「地形地基」已按《差距分析报告》落地（高度场 + 真实等高线 + 海拔分带设色 + 高度梯度悬崖/投影）；P1（道路寻路/河网/城区块）与 P2（次级地貌密度、水彩风格统一）未开始。

## 2. 快速上手

| 事项 | 说明 |
|---|---|
| 运行 | 双击 `index.html` 可用（file:// 下自定义字体被浏览器安全策略拦截，回退系统字体）；推荐 `python tools/serve.py` |
| 测试 | `node tools/sim.js`（无头渲染仿真+计时）、`node tools/hgt_test.js`（存档 v2 往返 + v1 兼容） |
| 性能剖析 | `node --cpu-prof --cpu-prof-dir=tools/prof tools/sim.js` + `python tools/prof_report.py` |
| 交互 | 滚轮缩放 / 空格或中键平移 / Ctrl+Z、Ctrl+Y / [ ] 笔刷 / 右键删装饰 / 双击改文字 |

## 3. 目录结构

```
index.html            页面骨架（头部按钮、三选项卡、画布、弹窗、视图控制）
css/style.css         全部样式 + @font-face（Teyvat UI）
js/noise.js           值噪声(五次淡入) / fbm(倍频间旋转防网格对齐) / mulberry32
js/terrain.js         ★核心：高度场、覆盖度场、距离场、等高线、渲染管线、
                      程序化世界生成、示例地图、工程序列化(v2)
js/decor.js           20 种装饰物矢量图元（基础形状拼贴、2.5D 手绘风、统一左上光源）
js/main.js            应用编排：画布双缓冲(全图/预览)、视图缩放平移、UI 构建、
                      交互、撤销/重做、图层树、存档/读档、自动保存、导出
assets/fonts/         genshin.ttf（见第 7 节版权说明——不入库）
tools/                serve.py / copy_font.py / sim.js / hgt_test.js / prof_report.py
_analysis/            用户提供的差距分析报告（不入库）
```

## 4. 核心架构（读代码前先读这节）

### 4.1 双数据层：类型网格 + 高度场

- **`T.grid`（Uint8Array 352×198）**：语义涂鸦层。0水 1草 2林 3山 4沙 5路。
- **`T.hgt`（Float32Array 352×198）**：真实高度场，0深海~1峰顶。这是 P0 的核心：
  等高线、海拔分带设色、悬崖立面、投影全部由它派生。
- **写入规则**：地形笔刷同步写两层数据（`stampGrid` + `stampHeight`，各类型有目标高度
  `H_TARGET`，山=0.80/草林=0.34/沙=0.16/水=0.04，叠加位置噪声产生有机抖动）；
  **道路笔刷只写 grid 不写 hgt**——道路"贴附在地形上"，这正是贴纸感问题的解法。
- 程序化生成（`T.generateWorld`）直接产出 hgt：域扭曲 fbm 高度场 + 径向衰减 → 群岛，
  陆地/山地占比用**分位数校准**（滑杆值=真实占比），湿度噪声按分位切森林。
- 示例地图（`T.loadDemo`）同样写双层。

### 4.2 每帧渲染前重建的派生场（`T.refreshDists`）

| 场 | 用途 |
|---|---|
| `distWater / distLand` | chamfer 距离场：沙滩宽度、浅滩、岸波、白沫 |
| `cov[1..5]` | 类型"覆盖度场"（两遍 3-tap 模糊），按 0.5 等值线分类→亚像素光滑边界 |
| `uniMask` | 3×3 同质掩码：内部大片区域走捷径，只有边界区做完整覆盖度采样（性能关键） |
| `contourMask` | **marching squares 从 hgt 提取的等高线**（层数=settings.cLevels，只画陆地，1 遍模糊） |

注意：`refreshDists` 在**每次渲染**都执行（约几 ms，可接受），所以改任何涂鸦立即生效。

### 4.3 渲染管线（`T.renderMap`，逐像素单遍）

1. 域扭曲采样（`F.wx/wy`，预计算于 `makeFields`，扭曲幅度=手绘抖动）得到采样坐标；
2. 同质捷径或覆盖度分类 → `id`（最高覆盖度）与 `sec`（次覆盖度）；
3. 海洋：dL 深度渐变 + 浅滩层 + 三道岸波 + 白沫 + 深色水线；
4. 陆地：`baseColor()` 按类型出基础色——**草地/森林按 hgt 海拔做三段 LUT**（低地深绿→坡地→
   平缓亮黄绿），叠加水彩噪声；等高线从 `contourMask` 采样叠加；
5. 地块融合：sec 覆盖度做点彩抖动混合（岩边抖动减弱）；
6. 沙滩层：dW<beachW 向沙色渐变 + 湿润暗带；描边内一圈赛璐璐受光亮边；
7. **悬崖立面与投影由高度梯度驱动**：`_h − hgt(东南2.4px) > 阈值` 且处于高地 → 岩壁色
   （FC1→FC2 渐变 + rkF 条纹）；`hgt(西北2.4px) − _h` 投影到右下地形；
8. 描边（海岸深色轮廓 wsum、地块细边 sec）、水彩颗粒（亮度+蓝通道微抖）。

### 4.4 性能预算（当前实测，Node 仿真）

全图 1600×900 ≈ 455ms；预览 800×450 ≈ 110ms（涂画时走预览，pointerup 走全图）。
热点：renderMap 主循环 > fieldAt 双线性 > baseColor。若要再优化：把 fieldAt 展开内联、
等高线 mask 降采样、hgt 采样改直接格读+手写平滑。

### 4.5 装饰物与视图

- 装饰物是**纯数据数组** `decors`（type/x/y/scale/rot/text），`drawDecors` 按 y 排序绘制；
  图元在 `D.DEFS`（decor.js），全部基础形状拼贴、纯色、统一描边与偏移投影。
- 图层树：按 建筑/自然/地标/文字标注 分组显隐 + 实时计数（settings.showCat / showLabels）。
- 视图：CSS transform（translate+scale）作用于 canvas 元素，`evtPos` 用
  `getBoundingClientRect()` 天然换算，滚轮以光标为中心缩放（0.5~4×），clampView 防拖出。

### 4.6 存档格式（v2）

```json
{ "app":"teyvat-map-atelier", "v":2, "gw":352, "gh":198, "palette":"mond",
  "settings":{...}, "grid":"<base64 uint8>", "hgt":"<base64 uint8=量化高度>",
  "decors":[{ "type","x","y","scale","rot","text?" }] }
```

- **v1 旧档兼容**：无 hgt 字段时 `synthHeightFromTypes()` 按类型合成高度
  （水盆/缓丘/高台，用 distWater 定水深），旧图自动获得新渲染。
- 自动保存：变更后 800ms 写 localStorage `teyvat-map-autosave`，启动时恢复。
- 撤销栈：{grid, hgt(量化Uint8), decors} 三元组快照 ×30，重做对称。

## 5. 已知问题 / 技术债

1. **渲染是单线程阻塞**：全图 455ms 在 pointerup 时有可感停顿。方向：Web Worker + OffscreenCanvas。
2. **等高线栅格化精度**：marching squares 结果画进网格掩码再模糊，放大看有 1 格宽度的锯齿；
   要更细可改为渲染期直接对 hgt 做 iso 判定（每像素算线距）。
3. **字体版权**：assets/fonts/genshin.ttf 是原神字体（miHoYo/汉仪版权），**没有入库**，
   仓库不含此文件；使用方需自行放置（见第 7 节）。代码对缺字体已优雅回退。
4. **file:// 直开**字体不加载（浏览器 CORS 策略），功能不受影响。
5. 大海洋深处颜色偏平（dL 渐变 7 格封顶）；可改用 hgt 水下延伸做深度。
6. 等高线密度滑杆(cLevels)改动会触发全图重算（refreshDists 内含等高线提取），无防抖。

## 6. 路线图（对应差距分析报告）

- **P1 空间骨架**（高度场已就位，都是"读数据"）：
  河流=从山地沿 hgt 最陡下降游走到海；道路=聚落间沿 hgt 缓坡 A*/最陡下降寻路再平滑；
  城区块=城墙范围 + 内部街道网格 + 批量屋顶（装饰物系统加"城区"组合类型）。
- **P2 风格打磨**：礁石/滩涂/河心洲等次级地貌由群系规则自动散布；色板 LUT 连续插值；
  线宽统一审查。
- **工程**：Web Worker 渲染；多层绘制（地形/道路分网格）；触屏双指缩放。

## 7. 发布到 GitHub 的注意事项

1. **字体不入库**：`.gitignore` 排除了 `assets/fonts/*.ttf`。原神字体为 miHoYo/汉仪版权，
   公开仓库再分发有法律风险。克隆者需自行放置 `assets/fonts/genshin.ttf`
   （或用 `python tools/copy_font.py` 从本机下载目录复制），缺字体时自动回退系统字体。
2. `_analysis/`（差距报告）与 `tools/prof/`（CPU 剖析产物）同样不入库。
3. 本地仓库已初始化并完成首次提交（分支 main）。推送：

```
git remote add origin https://github.com/ThRabbit-Studio/Genshin-Style-Map-Creation.git
git push -u origin main
```

> 本机当前无法直连 GitHub（HTTPS 证书链被拦、22 端口被拒、未装 gh CLI），
> 需在可访问 GitHub 的网络环境下执行；首次推送会由 Git Credential Manager 弹出登录。
4. 未添加 LICENSE 文件（选择开源协议是仓库所有者的决定）。

## 8. 约定速览（改代码前）

| 符号 | 含义 |
|---|---|
| RW/RH=1600/900 | 渲染分辨率（固定） |
| GW/GH=352/198 | 涂鸦网格分辨率（16:9，格≈4.5px） |
| grid 编码 | 0水 1草 2林 3山 4沙 5路 |
| hgt | 0深海 ~ 1峰顶，水陆分界≈0.15，草目标 0.34，山目标 0.80 |
| H_TARGET(main.js) | 笔刷类型→目标高度映射 |
| settings | 全部渲染参数（含 showCat/showLabels），随工程存档 |
| C / T.PALETTES | 当前色板 / 四套地区色板（蒙德·璃月·稻妻·层岩） |
| _fi / _h / _br... | renderMap 内的热循环闭包变量（逐像素写入，baseColor 读取） |
