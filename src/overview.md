# src 目录结构说明

## 文件

### `index.tsx`
应用入口。负责：
- 初始化 ag-grid 模块注册
- 加载全局样式
- 初始化游戏元数据（`Metadata.initialize()`）和存档（`SaveState.load()`）
- 挂载 React 应用到 DOM
- 在 `window.__HSR_DEBUG` 上暴露调试工具，可在浏览器控制台直接调用

### `App.tsx`
根组件。构建整体 UI 框架：顶部 Header、左侧 Sider、中央 Tabs 内容区，并包裹 Mantine 主题、弹窗、通知等全局 Provider。主题色变化时同步更新背景渐变。

---

## 文件夹

### `assets/`
静态资源，目前仅含 `fonts/` 字体文件，供 `style/fonts.css` 引用。

### `data/`
本地游戏数据（JSON 格式），应用启动时由 `Metadata` 读取：
- `game_data.json` — 角色、光锥、遗器套装等游戏数据
- `relic_main_affixes.json` / `relic_sub_affixes.json` — 遗器词条权重数据
- `sample-save.json` — 示例存档，用于开发调试

### `hooks/`
项目级自定义 React Hooks：
- `useDelayedProps.ts` — 延迟更新 props，避免高频渲染
- `usePromise.ts` — 将 Promise 状态绑定到组件

### `icons/`
SVG 图标封装为 React 组件，供 UI 各处复用（Discord、Github、上箭头、圆形徽章等）。

### `style/`
全局 CSS 样式：
- `tokens.css` — CSS 变量（颜色、间距等设计 token）
- `global.css` — 全局基础样式
- `fonts.css` — 字体声明
- `mantine-overrides.css` — 覆盖 Mantine 组件库默认样式
- `ag-grid-overrides.css` — 覆盖 ag-grid 表格默认样式
- `components.css` / `selecto.css` — 其他组件样式
- `*.module.css` — CSS Modules，作用域限定于对应组件

### `types/`
TypeScript 类型声明文件，覆盖项目各模块的数据结构：
- `character.ts` / `lightCone.ts` / `relic.ts` — 核心游戏实体类型
- `form.ts` / `optimizer.ts` — 优化器表单与计算结果类型
- `conditionals.ts` / `hitConditionalTypes.ts` — 条件效果类型
- `store.ts` — 全局状态类型
- `metadata.ts` / `setConfig.ts` / `characterConfig.ts` / `lightConeConfig.ts` — 元数据配置类型
- `resources.d.ts` — 由 `npm run update-resources` 自动生成的 i18n 资源类型，**不要手动修改**
- `i18next.ts` — i18n 类型扩展
- `window.ts` — `window.__HSR_DEBUG` 类型声明

### `lib/`
项目核心逻辑，按职责细分为 28 个子目录，是代码量最大的部分：

| 子目录 | 职责 |
|---|---|
| `constants/` | 全局常量 |
| `state/` | 应用状态初始化与存档管理 |
| `stores/` | Zustand 状态 store |
| `optimization/` | 遗器优化核心算法 |
| `simulations/` | 伤害模拟计算 |
| `gpu/` | WebGPU 加速计算 |
| `worker/` | Web Worker 线程池，负责后台优化计算 |
| `relics/` | 遗器评分、筛选、数据处理 |
| `scoring/` | 遗器评分体系 |
| `conditionals/` | 角色/光锥条件效果定义 |
| `sets/` | 遗器套装效果定义 |
| `tabs/` | 各功能页签组件（优化器、遗器、角色等） |
| `layout/` | 页面布局组件（Header、Sider） |
| `overlays/` | 全局弹窗、抽屉等覆盖层 |
| `ui/` | 通用 UI 组件与主题配置 |
| `rendering/` | 图片资源管理、渐变背景、角色展示渲染 |
| `characterPreview/` | 角色展示卡片 |
| `interactions/` | 通知、提示、确认弹窗等交互工具 |
| `importer/` | 从游戏数据导入角色/遗器 |
| `i18n/` | 国际化配置与语言选择器 |
| `hooks/` | lib 内部专用 React Hooks |
| `dataStructures/` | 通用数据结构工具 |
| `utils/` | 通用工具函数 |
| `services/` | 外部服务接口 |
| `spine/` | Spine 动画相关 |
| `dev/` | 开发调试工具（不参与生产逻辑） |
| `gpu/` | WebGPU 设备初始化与 shader |
| `constants/` | 游戏常量（属性名、词条名等） |
