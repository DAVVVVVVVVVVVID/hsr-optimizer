# src/lib 目录说明

项目核心逻辑所在，按职责分为以下几个功能区。

---

## 一、游戏数据与配置

### `constants/`
全局常量定义。包含属性名（`Stats.CR`、`Stats.CD`...）、部位名（`Parts.Head`...）、命途名、套装名、元素名等游戏枚举值，以及应用级常量（页面 key、计算引擎类型等）。整个项目都从这里 import，避免散落的魔法字符串。

### `state/`
应用启动时的初始化逻辑。
- `metadataInitializer.ts` — 读取 `game_data.json`，合并各角色的 `CharacterConfig`，构建运行时唯一数据源 `DBMetadata`
- `gameMetadata.ts` — 提供 `getGameMetadata()` 访问器
- `saveState.ts` — 存档的读取、保存、序列化（写入 localStorage）

### `sets/`
遗器套装效果的功能定义，结构与 `conditionals/` 类似。
- `relics/` — 内圈套装（4件套）效果实现，每个套装一个文件
- `ornaments/` — 外圈饰品（2件套）效果实现
- `setConfigRegistry.ts` — 套装注册表，将所有套装 id 映射到对应的 `SetConfig`

### `conditionals/`
角色和光锥的条件效果实现（详见 `src/types/conditionals_deep_dive.md`）。
- `character/` — 按角色 id 分目录，每个角色一个 `.ts` 文件，实现 `CharacterConfig`
- `lightcone/` — 按星级分目录，每个光锥一个 `.ts` 文件，实现 `LightConeConfig`
- `resolver/` — 注册表和解析器（`characterConfigRegistry`、`CharacterConditionalsResolver`）
- `conditionalUtils.ts` — 工具函数（`AbilityEidolon`、`createEnum` 等）
- `hitDefinitionBuilder.ts` — 链式 API，简化命中定义的构建

---

## 二、优化器核心

### `optimization/`
遗器组合优化的核心算法，是整个项目最复杂的部分。
- `engine/` — 计算引擎：属性容器（`ComputedStatsContainer`）、伤害计算器、键值配置
- `context/` — 优化上下文构建（`calculateContext.ts`，组装 `OptimizerContext`）
- `combo/` — 技能组合轮次（Combo）的类型和初始化
- `rotation/` — 行动轮次配置（普攻/战技/终结技的排列顺序）
- `optimizer.ts` — CPU 优化器主入口，遍历遗器组合
- `calculateConditionals.ts` — 调用各控制器钩子，将条件值转化为属性 buff
- `calculateStats.ts` — 基础属性计算
- `calculateDamage.ts` — 伤害计算
- `calculateTraces.ts` — 行迹加成计算
- `defaultForm.ts` — 生成角色的默认优化器表单
- `relicSetSolver.ts` — 套装匹配逻辑（找出满足套装筛选条件的组合）
- `sortOptions.ts` — 优化器结果的排序选项定义
- `bufferPacker.ts` — 将遗器数据打包为 GPU 可用的二进制缓冲区

### `gpu/`
WebGPU 加速计算，是 CPU 优化器的并行加速版本。
- `webgpuOptimizer.ts` — GPU 优化器入口
- `webgpuDevice.ts` — WebGPU 设备初始化和能力检测
- `webgpuInternals.ts` — shader 编译、pipeline 管理
- `wgsl/` — WGSL shader 源码（GPU 上运行的计算程序）
- `injection/` — 将角色/套装条件效果注入 shader
- `conditionals/` — 动态条件在 GPU 上的实现
- `webgpuReadme.md` — GPU 实现的详细说明文档

### `worker/`
Web Worker 线程池，让优化计算在后台线程运行，不阻塞 UI。
- `workerPool.ts` — 管理多个 Worker 实例，分发计算任务
- `optimizerWorker.ts` — Worker 内部逻辑（在独立线程中运行优化器）

### `simulations/`
伤害模拟计算，用于 DPS 评分和 benchmark。
- `simulateBuild.ts` — 对一套具体构建模拟一次完整战斗循环，计算总伤害
- `statSimulation.ts` / `statSimulationController.ts` — 副词条分配模拟（搜索最优副词条组合）
- `orchestrator/` — 评分流水线的编排，协调多个模拟任务
- `benchmarks/` — 基准分计算（满分参考构建）
- `statSimulationTypes.ts` — 模拟相关类型定义

---

## 三、遗器系统

### `relics/`
遗器数据处理的全部逻辑。
- `relicAugmenter.ts` — 注入 `augmentedStats`（展开所有属性，百分比转小数）
- `relicFilters.ts` — 优化器遗器筛选（按套装、主词条、加权分过滤）
- `relicRollFixer.ts` — 修正导入时的数值精度问题
- `relicRollGrader.ts` — 计算副词条各档位（高/中/低档）分布
- `relicUtils.ts` — 遗器相关通用工具函数
- `statCalculator.ts` — 遗器属性数值计算
- `scoreRelics.ts` / `scoreRelicsBatch.ts` — 遗器评分入口
- `scoring/` — 遗器评分算法（`relicScorer.ts`、`characterScore.ts`）
- `estTbp/` — 预计刷本次数估算（Est. TBP）

### `scoring/`
更高层的评分系统，基于模拟战斗结果给角色/构建打分。
- `scoringService.ts` — 评分服务，协调模拟和评分流程
- `dpsScore.ts` — DPS 评分计算
- `simScoringUtils.ts` — 模拟评分工具函数
- `scoringConfig.ts` — 评分类型配置（DPS/BUFFER/HEAL/SHIELD）
- `presetEffects.ts` — 常用套装/条件的预设效果
- `benchmarkPoolState.ts` — benchmark 结果的缓存状态
- `rollCounter.ts` — 副词条强化次数解析

---

## 四、UI 与页面

### `tabs/`
应用的各个功能页签，每个子目录对应一个页面。
- `tabOptimizer/` — 优化器主页面（最复杂，含表单、结果表格、条件面板、分析面板）
- `tabRelics/` — 遗器管理页（遗器列表、评分展示、遗器定位）
- `tabCharacters/` — 角色管理页（角色列表、构建管理）
- `tabShowcase/` — 角色展示卡页面
- `tabImport/` — 数据导入页面
- `tabBenchmarks/` — benchmark 页面
- `tabCalculators/` — 各类计算器（伤害、EHP 等）
- `tabChangelog/` — 更新日志页面
- `tabHome/` — 首页
- `tabMetadata/` — 元数据管理（图片中心点调整等开发工具）
- `tabWarp/` — 抽卡计算器
- `tabWebgpu/` — WebGPU 调试页面
- `Tabs.tsx` — 页签路由和容器组件

### `layout/`
整体页面布局框架。
- `LayoutHeader.tsx` — 顶部导航栏（语言切换、主题、版本信息等）
- `LayoutSider.tsx` — 左侧导航侧边栏（页签切换）
- `scrollController.ts` — 滚动位置管理

### `overlays/`
全局弹窗和抽屉，不属于任何单一页面。
- `modals/` — 各类弹窗（遗器详情、导入预览、角色选择等）
- `drawers/` — 抽屉面板（新手引导、设置、评分算法说明等）
- `GlobalModals.tsx` — 全局弹窗容器，挂载所有弹窗

### `characterPreview/`
角色展示卡片组件，用于 `tabShowcase` 和优化器结果详情。
- `CharacterPreview.tsx` — 展示卡主组件
- `card/` — 卡片内各区块（属性面板、光锥、遗器格等）
- `summary/` — 技能伤害汇总
- `scoring/` — 评分展示组件
- `buffsAnalysis/` — buff 来源分析
- `buildAnalysis/` — 构建分析
- `color/` — 展示卡主题色生成
- `customization/` — 自定义图片上传
- `showcaseDerivedData.ts` — 展示卡所需的派生计算数据

### `ui/`
通用 UI 组件和主题配置。
- `theme.ts` — Mantine 主题创建和 CSS 变量解析器
- 各类可复用组件（按钮、输入框包装、加载状态等）

### `rendering/`
图片资源管理和渲染工具。
- `assets.ts` — 角色/光锥/遗器图片的 URL 生成（`Assets.getCharacterAvatarById(id)` 等）
- `gradient.ts` — 动态背景渐变色管理
- `renderer.tsx` — 角色展示卡的截图渲染
- `gridRenderers.ts` — ag-grid 单元格自定义渲染器
- `lcImageTransform.ts` — 光锥图片的变换计算

### `spine/`
Spine 2D 骨骼动画，用于角色展示页的动态立绘。
- `spineEngine.ts` — Spine 运行时引擎封装
- `SpinePortrait.tsx` — Spine 动画 React 组件
- `LoadingBlurredSpine.tsx` — 加载中的模糊占位组件
- `manifest.ts` / `spineManifest.json` — 各角色的 Spine 资源清单

---

## 五、业务服务层

### `services/`
跨组件的业务逻辑，统一处理状态和副作用。
- `persistenceService.ts` — 存档加载/保存的核心逻辑（合并遗器、迁移数据、初始化 store）
- `equipmentService.ts` — 遗器装备/卸下操作
- `buildService.ts` — 构建的保存、加载、切换
- `buildConverter.ts` — 构建格式转换
- `buildMigration.ts` — 存档构建格式的版本迁移
- `migrations/` — 具体迁移实现（如 Novaflare 角色 id 迁移）

### `stores/`
Zustand 状态管理，按业务域拆分。
- `app/` — 全局应用状态（`appStore.ts`：版本、活动页面、会话数据等）
- `character/` — 角色列表状态
- `relic/` — 遗器库状态
- `optimizerForm/` — 优化器表单状态
- `optimizerUI/` — 优化器 UI 状态（结果表格、选中行等）
- `scoring/` — 评分相关状态
- `infrastructure/` — store 基础设施（中间件、持久化等）
- `themeStore.ts` — 主题色状态
- `gridStore.ts` — 表格状态
- `newFeatureStore.ts` — 新功能提示状态
- `ahaTuningStore.ts` / `ehrTuningStore.ts` — 特殊调优参数状态

---

## 六、数据导入

### `importer/`
从第三方扫描工具导出的数据转换为优化器内部格式（详见 `src/data/overview.md`）。
- `kelzFormatParser.tsx` — 解析 reliquary_archiver / Kelz 格式（V4）
- `hoyoLabFormatParser.tsx` — 解析米哈游官方 API 格式
- `characterConverter.ts` — 角色数据格式转换（含 `rollCounter`）
- `importConfig.ts` — 各扫描工具的配置（source 字符串、版本号、URL 等）

---

## 七、基础设施

### `i18n/`
国际化配置。
- `i18n.ts` — i18next 初始化，注册所有 namespace，配置语言检测
- `LanguageSelector.tsx` — 语言切换下拉菜单

### `interactions/`
用户交互的通用工具函数。
- `message.ts` — 全局消息通知（成功/失败/警告提示条）
- `notifications.tsx` — 更复杂的通知组件
- `hint.tsx` — Tooltip 提示内容
- `confirmModal.tsx` — 确认弹窗的 Context Provider 和调用函数
- `arrowKeyGridNavigation.ts` — 表格的键盘方向键导航

### `hooks/`
lib 内部专用的 React Hooks（区别于 `src/hooks/` 的项目级 hooks）。
- `useOpenClose.ts` — 控制开/关状态（弹窗、折叠面板等）
- `useConfirmAction.ts` — 需要确认的操作封装
- `useBlurCommittedNumberInput.ts` — 数字输入框（失焦时提交）
- `useScoringMetadata.ts` — 读取当前角色的评分配置
- `useScreenshotAction.ts` — 截图操作
- `useTabVisibility.ts` — 监听页签可见性（Page Visibility API）
- `useGridLocale.ts` — ag-grid 的 i18n 配置

### `dataStructures/`
通用数据结构。
- `minQueue.ts` — 最小优先队列（堆），用于优化器结果排序
- `fixedSizeMinQueue.ts` — 固定容量的最小优先队列

### `utils/`
通用工具函数。
- `mathUtils.ts` — 数学计算（精度取整、截断等）
- `arrayUtils.ts` — 数组操作
- `objectUtils.ts` — 对象操作
- `statUtils.ts` — 属性相关工具（`isFlat()` 判断是否为固定值属性等）
- `displayUtils.ts` — 数值格式化（展示用）
- `frontendUtils.ts` — 前端辅助工具
- `i18nUtils.ts` — i18n 辅助函数
- `miscUtils.ts` — 杂项工具（UUID 生成、版本比较等）
- `nativeFetch.ts` — 封装 fetch 请求
- `screenshotUtils.ts` — 截图工具

### `dev/`
仅用于开发调试的工具，不参与生产逻辑。
- `populateAllCharacters.ts` — 快速填充所有角色数据（调试用）
- `exportShowcaseColors.ts` / `resetShowcaseColors.ts` — 展示卡颜色的导出/重置工具
