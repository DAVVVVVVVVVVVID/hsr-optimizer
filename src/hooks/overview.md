# src/hooks 说明

项目级自定义 React Hooks，目前有两个。

---

## `useDelayedProps`

### 为什么要延迟更新 props？

React 每次 props 变化都会立刻重新渲染组件。如果某个组件渲染很重（比如要做大量计算或渲染大量 DOM），而它的 props 又会在短时间内连续变化（比如用户快速点击列表的不同行），就会产生大量无效的中间渲染——用户根本来不及看到这些中间状态，但 CPU 已经全跑了一遍。

### 什么是"延迟更新 props"？

本质是**防抖（debounce）**：props 变化后不立刻更新，而是等待 N 毫秒。如果这段时间内 props 又变了，就重置计时。只有当 props "稳定" N 毫秒没有再变，才真正触发组件更新。

```
props 变化 →  等待 50ms  →  50ms 内没有新变化  →  setDelayedProps  →  组件渲染
props 变化 →  等待 50ms  →  30ms 时又变了     →  清除旧 timer，重新等 50ms
```

### 什么时候需要用？

- 组件渲染代价高（计算量大、子树复杂）
- props 来自用户的连续操作（点击、滑动、输入）
- 可以接受短暂的显示延迟（几十毫秒用户感知不到）

### 代码中的实际使用

`ExpandedDataPanel.tsx:60` — 优化器结果表格下方的分析面板：

```tsx
function MemoizedExpandedDataPanel(props: { analysis: OptimizerResultAnalysis }) {
  const delayedAnalysis = useDelayedProps(props.analysis, 50)

  const memoized = useMemo(() => {
    return delayedAnalysis ? <AnalysisRender analysis={delayedAnalysis} /> : null
  }, [delayedAnalysis])

  if (!delayedAnalysis) return null
  return memoized
}
```

用户在优化结果表格中点击不同行时，`analysis` 数据会频繁更新。`useDelayedProps` 让 `AnalysisRender`（渲染属性对比、伤害分布等重型内容）延迟 50ms 才响应，避免用户快速浏览时每行都触发完整渲染。首次加载时 `delayedProps` 初始为 `null`，50ms 后才有值，组件在此之前不渲染。

---

## `usePromise`

### 什么是 Promise 状态？

Promise 有三种状态：
- **pending**（进行中）：异步操作还没完成
- **fulfilled**（已完成）：有了结果
- **rejected**（已失败）：出错了

### 为什么要把 Promise 状态绑定到组件？

React 组件是同步渲染的，但很多数据（如复杂评分计算）是异步得出的。如果直接在组件里 `.then()` 拿结果，结果到来时没有触发 React 重新渲染，界面不会更新。

需要把 Promise 的完成结果存入 `useState`，Promise resolve 时调用 `setState`，才能让 React 知道"有新数据了，请重新渲染"。

### 为什么不用 React 原生的 `use()` + Suspense？

React 提供了 `use(promise)` hook 配合 Suspense 边界来处理异步，但 **React DevTools Profiler 存在一个 bug**（见 [#35818](https://github.com/facebook/react/issues/35818)），使用 `use()` + Suspense 时会崩溃。`usePromise` 是规避这个 bug 的临时方案，等 bug 修复后会迁移回去。

### 什么时候需要用？

- 组件需要展示异步计算的结果（如评分、模拟伤害计算）
- 不想用 Suspense（或者需要规避上述 bug）
- 希望在等待期间渲染 `null` 或占位内容，而不是挂起整个子树

### 代码中的实际使用

**`useSimScoringHooks.ts`** — 角色评分展示：

```ts
export function useSimScore(configType: ScoringConfigType): SimulationScore | null {
  const slot = useContext(SimScoringContext).pipelines[configType]

  const promise = slot?.scoringPromise ?? null   // 异步评分任务（Promise）
  const cached  = slot?.cachedScore ?? null       // 上一次的缓存结果

  const promised = usePromise(promise)            // pending 时返回 null，完成后返回结果

  return cached ?? promised  // 优先用缓存，避免计算期间闪烁
}
```

`scoringPromise` 是角色评分的异步计算任务。`usePromise` 在计算期间返回 `null`，完成后把结果存入 state 触发重新渲染。`cached ?? promised` 的设计让界面在等待新结果时先显示上一次的评分，不会出现"先消失再出现"的闪烁。

### `usePromise` 内部的两个细节

**1. 防止 race condition（竞态）**：
如果 promise A 还没 resolve，用户切换角色触发了 promise B，A 不应该覆盖 B 的结果。`cancelled` 标记确保组件卸载或 promise 换新后，旧 promise 的结果被丢弃。

**2. 避免不必要的重渲染**：
切换角色时先把结果清为 `null`，但用了 `prev === null ? prev : null` 这个技巧——如果已经是 `null` 就返回同一个引用，React 不会触发重渲染。
