# HSR Optimizer 项目总结

> 原项目：[fribbels/hsr-optimizer](https://github.com/fribbels/hsr-optimizer)  
> 当前版本：v4.4.2  
> 在线地址：https://fribbels.github.io/hsr-optimizer/

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19.2.5 |
| 构建工具 | Vite 8.0.8 |
| 语言 | TypeScript 6.0.2 |
| UI 组件库 | Mantine 9.0.2 |
| 状态管理 | Zustand 5.0.11 |
| 数据网格 | AG Grid 35.2.1 |
| 图表 | Recharts 3.8.1 |
| 国际化 | i18next 26.0.8（配合 Crowdin 协作翻译） |
| 动画 | Spine WebGL 4.1.23（角色骨骼动画） |
| GPU 计算 | WebGPU（浏览器原生，用于高性能优化计算） |
| 拖拽 | @dnd-kit |
| WebSocket | partysocket（与遗器扫描仪通信） |
| 单元测试 | Vitest 4.1.4 |
| E2E 测试 | Playwright 1.59.1 |
| 代码检查 | Oxlint 1.60.0 |
| 部署 | GitHub Pages（gh-pages） |

Node.js 要求：>= 26.0.0；npm 要求：>= 11.0.0

---

## 页面情况

项目采用 Tab 导航结构，共有以下主要页面：

| Tab | 说明 |
|-----|------|
| **首页 (Home)** | 项目介绍和快速入口 |
| **优化器 (Optimizer)** | 核心功能页面，配置角色目标并搜索最优装备组合 |
| **角色 (Characters)** | 角色列表管理，支持过滤和角色信息查看 |
| **遗器 (Relics)** | 遗器库管理，含预览、推荐、评分分析 |
| **导入 (Import)** | 从游戏数据或扫描仪工具导入角色和遗器数据 |
| **展示 (Showcase)** | 角色卡片展示、DPS 评分显示、自定义配色 |
| **跃迁计划 (Warp)** | 跃迁目标设定与概率计算 |
| **基准测试 (Benchmarks)** | 角色性能基准对比和结果展示 |
| **计算器 (Calculators)** | 效果命中率（EHR）、击破点（TBP）等专项计算工具 |
| **更新日志 (Changelog)** | 版本更新记录 |

---

## 实现的功能

### 核心功能

1. **角色装备优化器**  
   根据角色技能条件、Buff 加成、队友协同等，枚举遗器组合，计算最优装备方案。支持 WebGPU 加速，大幅提升搜索速度。

2. **遗器评分系统**  
   对遗器主词条和副词条进行量化评分，直观展示遗器质量，辅助筛选和取舍。

3. **DPS 模拟评分**  
   基于战斗模拟引擎，对角色伤害输出进行数值化评估，支持不同配装方案的横向对比。

4. **条件与 Buff 系统**  
   完整实现了角色被动、光锥效果、套装加成、队友 Buff 等条件管理，优化计算时自动纳入计算。

5. **数据导入**  
   支持多种数据来源：Hoyolab 格式、Kelz 扫描仪格式，以及通过 WebSocket 与第三方遗器扫描工具实时通信。

6. **跃迁概率计算**  
   管理跃迁目标，计算在特定保底状态下抽取角色/光锥的期望消耗。

7. **国际化多语言**  
   通过 i18next + Crowdin，支持多语言界面翻译（中文、英文等）。

---

## 是否能在本地运行

**可以本地运行。** 步骤如下：

```bash
# 1. 进入项目目录
cd D:\PROJECT\2026_06\STARRAIL\hsr

# 2. 安装依赖（需 Node.js >= 26 和 npm >= 11）
npm install

# 3. 启动开发服务器
npm start
# 浏览器会自动打开 http://localhost:3000/hsr-optimizer
```

其他常用命令：

```bash
npm run build       # 生产环境构建
npm run preview     # 预览生产构建
npm run vitest      # 运行单元测试
npm test            # 运行 E2E 测试（需安装 Playwright 浏览器）
npm run typecheck   # TypeScript 类型检查
npm run deploy      # 部署到 GitHub Pages
```

**注意事项：**
- Node.js 版本需 >= 26，建议使用 nvm 管理版本（项目根目录有 `.nvmrc` 文件）
- WebGPU 功能需要支持 WebGPU 的现代浏览器（Chrome 113+ 或 Edge 113+）
- 首次运行需联网加载游戏数据，或先通过 Import 页面导入本地数据
