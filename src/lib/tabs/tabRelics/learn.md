# tabRelics 学习笔记

## 一、目录结构与文件职责

### 入口

| 文件 | 作用 |
|------|------|
| `RelicsTab.tsx` | 整个 Tab 的根组件，把所有子区域组合在一起 |
| `relicsTabController.ts` | 控制器，处理业务逻辑（过滤、排序、搜索等操作） |
| `useRelicsTabStore.ts` | 该 Tab 的 Zustand store，所有状态集中在这里 |
| `useRelicsTabStore.test.ts` | store 的单元测试 |

### 顶部工具栏 `topBar/`

| 文件 | 作用 |
|------|------|
| `topBar/TopBar.tsx` | 顶部整体容器（搜索框 + 过滤标签栏） |
| `topBar/FilterPillBar.tsx` | 一排过滤标签（套装/部位/稀有度等） |
| `topBar/FilterPill.tsx` | 单个过滤标签按钮组件 |
| `topBar/FilterPill.module.css` | FilterPill 的样式 |

### 遗器列表区域

| 文件 | 作用 |
|------|------|
| `RelicsGrid.tsx` | 遗器网格列表（虚拟滚动大列表） |
| `columnDefs.ts` | 定义列表的列（列名、宽度、渲染方式） |
| `RelicLocator.tsx` | 定位遗器在列表中的位置 |
| `RecentRelics.tsx` | 最近获取的遗器区域 |
| `RecentRelicCard.tsx` | 单张"最近遗器"卡片 |
| `RecentRelicCard.module.css` | 卡片样式 |

### 遗器预览 `relicPreview/`

| 文件 | 作用 |
|------|------|
| `RelicPreview.tsx` | 点击遗器后右侧的详情预览面板 |
| `relicPreview/RelicStatRow.tsx` | 预览中单行词条（主词条/副词条） |
| `relicPreview/RelicStatText.tsx` | 词条的文字渲染 |
| `relicPreview/RelicStatRow.module.css` | 词条行样式 |

### 底部浮层 `bottomDock/`

| 文件 | 作用 |
|------|------|
| `bottomDock/BottomDock.tsx` | 底部弹出面板容器 |
| `bottomDock/BottomToolbar.tsx` | 底部工具栏按钮 |
| `bottomDock/ScoredRelicPreview.tsx` | 带评分信息的遗器预览 |
| `bottomDock/useRelicScore.ts` | 计算遗器评分的 hook |

### 遗器洞察面板 `relicInsightsPanel/`

| 文件 | 作用 |
|------|------|
| `relicInsightsPanel/RelicInsightsPanel.tsx` | 洞察面板容器 |
| `relicInsightsPanel/BucketsPanel.tsx` | 词条分布桶状图 |
| `relicInsightsPanel/Top10Panel.tsx` | 当前筛选下 Top10 遗器 |
| `relicInsightsPanel/Estbp.tsx` | 估算潜力分（estimated best potential） |

### 整体数据流向

```
用户操作 TopBar 过滤
    ↓
relicsTabController.ts 处理逻辑
    ↓
useRelicsTabStore.ts 更新状态
    ↓
RelicsGrid.tsx 重新渲染列表
    ↓
点击遗器 → RelicPreview / BottomDock 显示详情
```

---

## 二、学习路线

### 第一阶段：最小组件——只接收 props、只渲染 UI
> 目标：理解组件的基本形态，props 是什么，JSX 怎么写

1. `relicPreview/RelicStatText.tsx` — 29行，最简单的组件，接收 props → 输出一个 `<div>`
2. `relicPreview/RelicStatRow.tsx` — 简单一行词条渲染，学组件组合

#### 学到的知识点

**props**
- props 是组件的输入参数，父组件传入，子组件只能读取不能修改
- 用 `type XxxProps = ...` 定义 props 的类型，再在函数签名里 `props: XxxProps` 绑定
- `React.HTMLAttributes<HTMLDivElement>` 表示继承 div 的所有原生属性（style/className/onClick等）
- `&` 交叉类型：在已有类型基础上追加额外字段
- `?` 表示该字段可选

**TypeScript 工具类型**
- `Record<K, V>`：键为 K 类型、值为 V 类型的对象
- `Partial<T>`：把 T 的所有字段变为可选，不需要填满所有 key
- `keyof typeof obj`：从对象的 key 自动生成联合类型（单一数据源，不用手动维护 enum）

**React 核心**
- `memo(fn)`：包裹组件，props 不变则跳过重新渲染（组件级缓存）
- `useMemo(() => expr, [deps])`：缓存计算结果，依赖项不变则不重算（计算级缓存）
- `type CSSProperties`：描述 CSS 样式对象结构的 TS 类型，只在编译期存在

**组件函数的完整结构**（按需选用，只有函数签名和 return JSX 是必须的）
```tsx
function MyComponent(props: MyProps) {
  const { name } = props                          // ① 解构 props
  const count = useMyStore((s) => s.count)        // ② 读 Zustand store（可选）
  const [isOpen, setIsOpen] = useState(false)     // ③ 内部状态 useState（可选）
  const display = useMemo(() => name.toUpperCase(), [name]) // ④ 缓存计算（可选）
  useEffect(() => { ... }, [])                    // ⑤ 副作用（可选）
  const handleClick = () => setIsOpen(true)       // ⑥ 事件处理函数（可选）
  if (!name) return null                          // ⑦ 条件渲染（可选）
  return <div onClick={handleClick}>{display}</div> // ⑧ 返回 JSX（必须）
}
```

### 第二阶段：带内部状态的组件——useState
> 目标：理解组件自己管理状态，不涉及 Zustand

3. `topBar/FilterPill.tsx` — 用 `useState` 管理搜索关键词和下拉框开关，学 `useState` + 事件处理

#### 学到的知识点

**useState**
- 格式：`const [状态值, 修改函数] = useState(初始值)`
- 调用修改函数才会触发组件重新渲染；直接修改变量不会更新界面
- 组件内部的临时状态（如搜索词）适合用 useState；关闭弹窗时应清空，保持干净初始状态

**数组方法**
- `.filter((item) => 条件)`：保留满足条件的元素，返回新数组，长度 ≤ 原数组
- `.map((item) => 新值)`：每个元素转换成新值，返回新数组，长度不变
- `.includes(value)`：判断数组是否包含某个值，返回 boolean
- `.find((item) => 条件)`：找到第一个满足条件的元素，找不到返回 undefined
- 链式调用：`.filter(...).map(...)` 先过滤再转换

**Set**
- `new Set(array)`：数组转集合，自动去重
- `set.has(value)`：查找是否存在，比数组 `.includes()` 快（O(1) vs O(n)）
- 适合"需要频繁判断某值是否存在"的场景

**两种数据的职责区分**
- 组件内部临时状态（`search`）用 `useState` 管理，生命周期跟随组件
- 真正的业务数据（`selected` 已选项）由父组件通过 props 传入，子组件只调用 `onChange` 通知，不直接修改

**Mantine Combobox 结构**
```
<Combobox store={combobox} onOptionSubmit={...}>   ← 根容器，绑定状态和选中回调
  <Combobox.Target>                                ← 触发元素（按钮/输入框等，始终可见）
  <Combobox.Dropdown>                              ← 弹出层
    <Combobox.Search value onChange />             ← 搜索框（可选）
    <Combobox.Options>                             ← 选项列表
      <Combobox.Option value>                      ← 单个选项
      <Combobox.Empty>                             ← 无结果占位
```
- `useCombobox()` 管理弹出层开关状态，提供 `toggleDropdown / focusSearchInput` 等方法
- 参考文档：https://mantine.dev

### 第三阶段：Zustand store 定义
> 目标：理解 store 的结构，状态字段和方法怎么定义

4. `useRelicsTabStore.ts` — 先只看状态字段和 `set()` 调用，不用全部看懂

#### 学到的知识点

**Zustand store 的标准结构**
```typescript
// 1. 拆成两个 interface 分别定义（职责清晰）
interface XxxStateValues  { /* 数据字段 */ }
interface XxxStateActions { /* 操作方法 */ }
type XxxState = XxxStateValues & XxxStateActions  // 合并

// 2. 定义默认值
const defaultState: XxxStateValues = { ... }

// 3. 创建 store
const useXxxStore = createTabAwareStore<XxxState>((set, get) => ({
  ...defaultState,          // 展开默认值初始化数据层
  setXxx: (val) => set({ xxx: val }),  // 简单更新：直接覆盖
  setXxx: (key) => (val) => set((s) => ({ filters: { ...s.filters, [key]: val } })), // 柯里化：修改嵌套字段
  resetXxx: () => set({ xxx: clone(defaultState.xxx) }), // 重置：深拷贝防引用污染
}))
```

**set() 的两种写法**
- `set({ key: value })`：直接传新值，Zustand 自动合并进 store
- `set((s) => ({ key: derive(s.key) }))`：传函数，`s` 是当前状态，用于需要读旧值的场景

**get() 的作用**
- `get()` 在方法内部读取当前 store 状态，用于判断是否需要更新（防止无效渲染）

**性能技巧**
- 数组展开 `[...arr]` 创建新引用，内容相同也会触发重渲染；更新前先比较内容，相同则跳过 `set()`
- `clone(obj)` 深拷贝：重置时用，防止 defaultState 被修改污染初始值
- `createTabAwareStore` 替代普通 `create()`：Tab 隐藏时 store 更新不通知 React，切回来才同步

**createTabAwareStore 原理**
- 普通 Zustand：store 数据变化 → 立刻通知所有订阅组件重渲染（包括隐藏的 Tab）
- createTabAwareStore：通过 `TabVisibilityContext` 感知当前 Tab 是否可见
  - Tab 隐藏时：store 数据在内存里更新，但不调用 React 的 `onStoreChange`，零重渲染
  - Tab 切回来时：激活监听器触发，检查数据是否变化，有变化才通知 React 同步一次
- 使用方式与普通 Zustand 完全相同，只是把 `create()` 换成 `createTabAwareStore()`

**TypeScript 高级类型**
- `ReturnType<typeof fn>[number]['field']`：逐层提取函数返回值类型中的深层字段类型
- 好处：单一数据源，源头修改后类型自动更新

**store 存储的内容（以 RelicsTab 为例）**
```
选中状态  selectedRelicId / selectedRelicsIds  当前选中的遗器
角色关联  focusCharacter                       聚焦角色影响评分显示
列表配置  valueColumns / filters               显示哪些列、当前过滤条件
洞察面板  insightsMode / insightsCharacters    视图类型和统计范围
```

### 第四阶段：组件读取 Zustand store
> 目标：理解组件怎么从 store 里取数据

5. `topBar/FilterPillBar.tsx` — 从 store 读过滤条件，传给 FilterPill 渲染
6. `topBar/TopBar.tsx` — 组合多个子组件，理解组件层级

#### 学到的知识点

**组件从 store 读取数据的标准写法**
```typescript
// 单个字段（简单场景）
const filters = useRelicsTabStore((s) => s.filters)

// 多个字段（用 useShallow 避免无效重渲染）
const { filters, setFilter, valueColumns } = useRelicsTabStore(
  useShallow((s) => ({
    filters: s.filters,
    setFilter: s.setFilter,
    valueColumns: s.valueColumns,
  }))
)
```

**为什么需要 useShallow**
- 不加：每次 store 任意字段变化，选择器返回新对象引用 → 组件必定重渲染
- 加上：Zustand 逐字段浅比较，只有实际取出的字段值变化时才重渲染
- 取多个字段时应始终使用 `useShallow`

**组件与 store 的关系模式**
```
store（数据源）
  ↓ useRelicsTabStore(useShallow(...)) 读取
FilterPillBar（中间层）
  ↓ 把 filters 和 setFilter 作为 props 传下去
FilterPill（叶子组件）
  不直接访问 store，只通过 props 接收数据和回调
```
- 叶子组件不直接读 store，保持"纯"：只关心 props，方便复用和测试
- 中间层负责连接 store 和 UI

**新开发者如何熟悉已有组件和方法**

这是所有新人都会遇到的问题，几个实用方法：

1. **先看 `lib/ui/` 目录** — 这个项目把通用 UI 组件集中放在这里，是最值得优先浏览的地方，能避免重复造轮子。

2. **用 Grep/全局搜索** — 写一个功能前，先搜关键词。比如要做"角色选择"，搜 `CharacterSelect` 看有没有现成的。

3. **看相似功能的实现** — 要做新过滤器，就看已有的 `FilterPill` 怎么做的，大概率能复用。

4. **IDE 的"转到定义"和"查找引用"** — `F12` 跳到定义，`Shift+F12` 看谁在用它，快速建立连接。

5. **问原作者 / 看 PR** — 这个项目这种规模，直接看 GitHub issue 和 PR 记录能了解很多设计决策。

6. **接受重复是正常的** — 哪怕重复写了，code review 时原作者会指出来，重构掉就行。没有开发者能在不熟悉代码库的情况下做到零重复，这是正常的学习成本。

### 第五阶段：业务逻辑层
> 目标：理解 controller 怎么调用 store、处理用户操作

7. `relicsTabController.ts` — 看过滤/排序等操作如何修改 store

---

#### 核心问题一：为什么有些逻辑写在 controller 里，不写在组件里？

React 组件里有两种逻辑需要区分：

| 对比项 | 组件逻辑（写在 `.tsx` 里） | Controller 逻辑（写在 `relicsTabController.ts`） |
|--------|--------------------------|--------------------------------------------------|
| 依赖 hooks | 是（useState/useMemo/useStore 等） | 否，纯函数 |
| 执行时机 | 渲染时（render 期间）运行 | 事件触发时（用户操作后）命令式调用 |
| 负责的事 | "如何显示"（UI 结构、样式、数据绑定） | "用户操作后做什么"（修改 store、调 API、弹窗） |
| 举例 | `useMemo` 生成选项列表、`useState` 管理搜索词 | 双击行打开弹窗、确认删除、弹窗保存 |

**规则：凡是需要 React hooks 的逻辑，只能写在组件里；不需要 hooks 的纯业务逻辑（尤其是事件处理），抽到 controller，组件只做 `onClick={RelicsTabController.editClicked}` 这样的绑定。**

好处：
- 测试容易：controller 是普通对象，不需要 render 就能直接调用和断言
- 逻辑集中：所有"用户操作"入口在一个文件找得到，不用翻七八个组件
- 组件更干净：组件只关心"显示"，不掺杂业务判断

`relicsTabController.ts` 怎么访问 store？—— 用 `useRelicsTabStore.getState()`。这是 Zustand 在 hooks 之外读写 store 的方式，不需要 `useXxxStore()` 这个 hook，因此可以在普通函数中调用。

---

#### 核心问题二：数据的六种存储形式

在这个 tabRelics 文件夹里，数据/状态可以通过六种方式存储和传递：

| 存储形式 | 作用范围 | 典型用途 | 本文件夹示例 |
|----------|----------|----------|--------------|
| **props** | 父组件 → 子组件，单向只读 | 把数据/回调传给子组件 | `FilterPill` 接收 `options`/`selected`/`onChange` |
| **useState** | 单个组件内部，触发重渲染 | 输入框内容、下拉框开关等临时 UI 状态 | `FilterPill` 里的 `search` 搜索词 |
| **Zustand store** | 全局，任意组件可读写，触发订阅者重渲染 | 需要跨组件共享的业务数据 | `useRelicsTabStore`：过滤条件、选中遗器 ID、数值列配置 |
| **useRef** | 单个组件内部，**不触发重渲染** | 定时器 ID、前一次值、直接操作 DOM | AG Grid 的 `gridRef`、`setTimeout` 返回的 timer ID |
| **Context** | 组件树隐式传递，不用 props 逐层传 | 主题、当前 Tab 可见性等"环境数据" | `TabVisibilityContext`（createTabAwareStore 用来判断 tab 是否可见） |
| **localStorage** | 持久化，跨页面刷新/关闭浏览器 | 用户设置、存档数据 | `SaveState.delayedSave()`：排除角色、过滤条件等用户偏好落盘 |

**六种形式的关系：**

```
localStorage ←→ Zustand store ←→ 组件
                     ↑
              createTabAwareStore
              （tab 不可见时暂停更新）
                     
组件内部：useState（有 UI 交互的临时状态）
         useRef（不需要触发渲染的引用）
         
父→子：props（只读，子组件不能改）
跨层：Context（适合不频繁变化的环境数据）
```

**选择依据（简单判断流程）：**
1. 需要跨多个组件共享？→ **Zustand store**
2. 只在这一个组件用，改变要重新渲染？→ **useState**
3. 只在这一个组件用，改变不需要重新渲染（比如定时器、DOM 引用）？→ **useRef**
4. 父组件要给子组件数据或者回调？→ **props**
5. 整棵子树都要用、但不想一层层传 props？→ **Context**
6. 刷新页面之后还要保留？→ **localStorage**（通常配合 Zustand store 一起用，store 是内存版，localStorage 是硬盘版）

---

#### 核心问题三：controller 为什么不在根组件导入，而是分散在子组件里？

实际导入情况：

| 导入位置 | 用的方法 | 原因 |
|----------|----------|------|
| `RelicsGrid.tsx` | `onSelectionChanged` / `onRowDoubleClicked` / `navigateToNextCell` | 这些是 AG Grid 的事件回调，只有表格组件才需要绑定 |
| `BottomToolbar.tsx` | `addClicked` / `deleteConfirmed` / `editClicked` | 这些是工具栏按钮的点击事件，只有工具栏组件才有这些按钮 |
| `ScoredRelicPreview.tsx` | `onRelicModalOk` | 预览卡片点击编辑时打开弹窗的回调 |

**如果在根组件 `RelicsTab` 统一导入再往下传，会产生 props drilling（prop 穿透）：**

```
RelicsTab
  → props.onSelectionChanged → RelicsGrid（只有它用得到）
  → props.addClicked → BottomDock → BottomToolbar（中间层不需要，只是转手）
```

中间层被迫接收一堆自己用不到的 props，代码冗余且难以维护。

**controller 是普通对象（不是 hook），任何文件都可以直接 `import`，不需要经过 props 传递。** 所以正确做法是：**谁用谁导入，在最近的地方绑定**，根组件完全不需要知道 controller 的存在。

### 第六阶段：复杂组件
> 目标：理解 `useMemo`、子组件组合、条件渲染

8. `RelicPreview.tsx` — 遗器详情面板
9. `RecentRelicCard.tsx` — 带评分计算的卡片，`useMemo` 用得多

### 第七阶段：根组件
> 目标：看懂整个 Tab 怎么组装起来

10. `RelicsTab.tsx` — 把前面所有组件组合在一起，整体脉络就清楚了

---

#### RelicsTab.tsx 做了什么

`RelicsTab` 是整个 Tab 的根组件，从上到下垂直排列四个子组件：

```
<RelicsTab>
  <TopBar />              ← 始终渲染：过滤栏 + 搜索
  <RecentRelics />        ← 条件渲染：仅扫描仪连接且有遗器时显示
  <RelicsGrid />          ← 始终渲染：遗器列表表格
  <BottomDock />          ← 懒加载：首次激活 Tab 后才创建
</RelicsTab>
```

**根组件的三个额外职责（不只是"组装"）：**

**1. 条件渲染 — 最近更新遗器栏**
```ts
const hasRecentRelics = useScannerState((s) => s.connected && s.recentRelics.length > 0)
{hasRecentRelics && <RecentRelics />}
```
平时这个区域根本不存在于 DOM，只有实时扫描仪（WebSocket 工具）连接并扫到遗器时才出现。`{条件 && <组件 />}` 是 React 条件渲染的常见写法。

**2. 延迟激活 — 首次切换 Tab 才设置 activated**
```ts
const [activated, setActivated] = useState(isActiveRef.current)
useEffect(() => {
  if (activated) return
  return addActivationListener(() => setActivated(true))
}, [...])
```
`activated` 初始为 false，用户第一次点击 Relics 标签后变为 true，之后永远不会变回 false。这个状态只用于控制 BottomDock 的懒加载，不影响其他子组件。

**3. 懒加载 — BottomDock 首次激活后才创建**
```ts
<DeferCreateProvider resetKey={null} enabled={activated}>
  <BottomDock />
</DeferCreateProvider>
```
`enabled={false}` 时 `DeferCreateProvider` 不渲染任何内容，`BottomDock` 不存在。用户第一次切过来之后 `enabled` 变 true，BottomDock 才被创建。目的是减少应用启动时的初始渲染开销——用户没打开这个 Tab 就不需要创建这些组件。

**根组件模式总结：** 根组件不只是"容器"，它还承担**控制子组件何时存在**的职责，这是 React 应用里根组件的常见模式。

### 暂时跳过
- `RelicsGrid.tsx`：虚拟滚动列表，性能优化技巧多，初学阶段不必深究
- `relicInsightsPanel/`：复杂的数据可视化，和 React 基础学习关系不大
- `bottomDock/`：可以留到最后

---

## 三、如何从零写一个新的 Tab

### 核心原则：先数据后 UI，先叶节点后根节点

写 Tab 的顺序和阅读代码的顺序**相反**——学习时从小组件看到根组件，开发时从 store 写到根组件。

---

### 第一步：明确需求，设计数据模型

在写任何代码之前，先回答三个问题：

1. **这个 Tab 要展示什么数据？** 这些数据从哪里来（全局 store？API？计算得出？）
2. **用户可以做哪些操作？** 每个操作会改变什么状态？
3. **哪些状态需要持久化？** 刷新页面后要保留的用 localStorage

这一步决定 store 的结构，写清楚之后后面所有代码都有依据。

---

### 第二步：创建文件夹和基础结构

在 `src/lib/tabs/` 下新建文件夹，参考 tabRelics 的结构：

```
src/lib/tabs/tabXxx/
  useXxxTabStore.ts        ← 第三步写
  xxxTabController.ts      ← 第四步写
  topBar/
    TopBar.tsx             ← 第五步写（子组件）
  XxxTab.tsx               ← 最后写（根组件）
```

简单的 Tab 不需要所有子文件夹，按需创建。

---

### 第三步：写 Store（useXxxTabStore.ts）

这是整个 Tab 的数据核心，先写它，后面所有组件都依赖它。

```ts
// 1. 定义数据层（存什么）
interface XxxTabStateValues {
  selectedId: string | null
  filters: { ... }
  // ...
}

// 2. 定义操作层（能做什么）
interface XxxTabStateActions {
  setSelectedId: (id: string | null) => void
  setFilter: (key: ...) => (value: ...) => void
  resetFilters: () => void
}

// 3. 合并类型
type XxxTabState = XxxTabStateValues & XxxTabStateActions

// 4. 创建 store（用 createTabAwareStore，Tab 不可见时暂停更新）
const useXxxTabStore = createTabAwareStore<XxxTabState>((set, get) => ({
  ...defaultState,
  setSelectedId: (selectedId) => set({ selectedId }),
  // ...
}))
```

**写 store 时的注意点：**
- `StateValues` 和 `StateActions` 分开定义，结构更清晰
- 重置操作用 `clone(defaultState.xxx)` 深拷贝，防止引用污染
- 数组更新用展开符 `[...newArr]` 创建新数组，触发 React 重渲染

---

### 第四步：写 Controller（xxxTabController.ts）

把所有用户操作的业务逻辑集中在这里，不写任何 JSX 和 hooks。

```ts
export const XxxTabController = {
  // 用 useXxxTabStore.getState() 在 hook 外访问 store
  handleItemClick(id: string) {
    useXxxTabStore.getState().setSelectedId(id)
  },

  handleDelete() {
    const { selectedId } = useXxxTabStore.getState()
    if (!selectedId) return Message.error('...')
    // 业务逻辑...
    SaveState.delayedSave()
  },
}
```

**判断逻辑写在哪：**
- 需要 hooks（useState/useMemo）的 → 只能写在组件里
- 不需要 hooks 的事件处理逻辑 → 写在 controller

---

### 第五步：从叶节点开始写子组件

**从最小、最独立的组件开始，逐步向上组合。**

**纯展示组件（不连接 store，只接受 props）：**
```tsx
// 最简单：只接受 props，用 memo 包裹
export const XxxCard = memo(function XxxCard({ item, score }: XxxCardProps) {
  return <div>...</div>
})
```

**连接 store 的容器组件：**
```tsx
export function XxxToolbar() {
  // useShallow：多字段取值时防止无效重渲染
  const { selectedId, filters, setFilter } = useXxxTabStore(
    useShallow((s) => ({ selectedId: s.selectedId, filters: s.filters, setFilter: s.setFilter }))
  )

  // 稳定的事件处理引用（避免子组件 memo 失效）
  const handlers = useMemo(() => ({
    type: setFilter('type'),
  }), [setFilter])

  return (
    <div>
      <button onClick={XxxTabController.handleDelete}>删除</button>
    </div>
  )
}
```

**组件开发的顺序：**
1. 先写不依赖 store 的纯展示组件
2. 再写读取 store 的容器组件
3. 最后在根组件里组装

---

### 第六步：写根组件（XxxTab.tsx）

根组件负责**组装**和**控制子组件何时存在**，自身逻辑越少越好。

```tsx
export function XxxTab() {
  // 懒加载：首次激活 Tab 后才创建重型子组件
  const { isActiveRef, addActivationListener } = useContext(TabVisibilityContext)
  const [activated, setActivated] = useState(isActiveRef.current)
  useEffect(() => {
    if (activated) return
    return addActivationListener(() => setActivated(true))
  }, [activated, addActivationListener])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <XxxTopBar />
      <XxxList />
      {/* 重型组件用 DeferCreateProvider 懒加载 */}
      <DeferCreateProvider resetKey={null} enabled={activated}>
        <XxxBottomDock />
      </DeferCreateProvider>
    </div>
  )
}
```

---

### 第七步：注册 Tab 到导航

在路由/导航配置里加入新 Tab 的入口（具体文件视项目结构而定，通常在 `src/lib/overlays/drawers/` 或路由配置文件中）。

---

### 开发方法总结

| 阶段 | 做什么 | 关键问题 |
|------|--------|----------|
| 设计 | 明确数据模型和用户操作 | 这个 Tab 存什么？用户能做什么？ |
| Store | 写 StateValues + StateActions | 数据层和操作层分开定义 |
| Controller | 写业务逻辑（无 hooks） | 用 `getState()` 在 hook 外访问 store |
| 子组件 | 从叶节点向上，先纯展示后连 store | 谁用 controller 谁导入，不往下传 |
| 根组件 | 组装 + 控制何时存在 | 条件渲染、懒加载 |
| 注册 | 加到导航 | — |

**遇到不确定的地方：直接看 tabRelics 里对应的文件，照着模式写。**
