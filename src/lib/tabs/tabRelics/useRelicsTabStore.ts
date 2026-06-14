import {
  type MainStats,
  type Parts,
  type Sets,
  type SubStats,
} from 'lib/constants/constants'
import { createTabAwareStore } from 'lib/stores/infrastructure/createTabAwareStore'
import { type generateValueColumnOptions } from 'lib/tabs/tabRelics/columnDefs'
import { clone } from 'lib/utils/objectUtils'
import type { CharacterId } from 'types/character'
import type { Relic } from 'types/relic'

// 从 generateValueColumnOptions 的返回值类型中逐层提取 value 字段的类型
// ReturnType<typeof fn> → 函数返回值类型
// [number]              → 数组中任意一个元素的类型
// ['options'][number]   → options 数组中任意一个元素的类型
// ['value']            → 该元素的 value 字段类型
// 最终得到所有可选"数值列"字段路径的联合类型：
//   'weights.currentPct' | 'weights.potentialSelected.averagePct' | 'weights.potentialSelected.bestPct'
//   | 'weights.rerollAvgSelected' | 'weights.potentialAllCustom.averagePct' | ... 等
// 好处：单一数据源，columnDefs 里加新列后此类型自动更新，无需手动维护
export type ValueColumnField = ReturnType<typeof generateValueColumnOptions>[number]['options'][number]['value']

// 遗器列表的过滤条件，每个字段都是数组（支持多选）
export type RelicTabFilters = {
  part: Array<Parts>,          // 部位（头/手/身/脚/球/绳）
  enhance: Array<number>,      // 强化等级（0/3/6/9/12/15）
  grade: Array<number>,        // 稀有度（2/3/4/5星）
  initialRolls: Array<number>, // 初始词条数（副词条初始数量）
  verified: Array<boolean>,    // 是否已验证（从游戏内扫描导入的遗器）
  equipped: Array<boolean>,    // 是否已装备
  set: Array<Sets>,            // 套装
  mainStat: Array<MainStats>,  // 主词条
  subStat: Array<SubStats>,    // 副词条（包含该词条即匹配）
}

// 遗器洞察面板的三种视图（对应 relicInsightsPanel/ 下的三个组件）
export enum RelicInsights {
  Buckets, // 分布图：按评分区间统计遗器数量的柱状图
  Top10,   // Top10：当前筛选条件下评分最高的10件遗器
  ESTBP,   // 估算最佳潜力（Estimated Best Potential）：预测遗器满强化后的最高评分
}

// 洞察面板统计范围：以哪些角色的评分标准来计算
export enum InsightCharacters {
  All,    // 全部角色
  Custom, // 自定义选择的角色
  Owned,  // 已拥有的角色
}

// 数据层的初始默认值，store 创建时和 resetFilters() 时使用
const defaultState: RelicsTabStateValues = {
  focusCharacter: null,       // 无聚焦角色
  selectedRelicId: null,      // 无选中遗器
  selectedRelicsIds: [],      // 无多选遗器
  valueColumns: [             // 默认显示的7列数值列
    'weights.currentPct',
    'weights.rerollAvgSelected',
    'weights.rerollAvgSelectedDelta',
    'weights.potentialSelected.averagePct',
    'weights.potentialSelected.bestPct',
    'weights.potentialAllCustom.averagePct',
    'weights.potentialAllCustom.bestPct',
  ],
  excludedRelicPotentialCharacters: [], // 不排除任何角色
  filters: {                  // 所有过滤条件为空数组 = 不过滤，显示全部遗器
    part: [],
    enhance: [],
    grade: [],
    initialRolls: [],
    verified: [],
    equipped: [],
    set: [],
    mainStat: [],
    subStat: [],
  },
  insightsMode: RelicInsights.Buckets,       // 洞察面板默认显示分布图
  insightsCharacters: InsightCharacters.Custom, // 默认统计自定义角色
}

// ── 数据层：store 里存储的所有状态字段 ──
interface RelicsTabStateValues {
  focusCharacter: CharacterId | null                 // 当前聚焦的角色（用于过滤遗器评分）
  selectedRelicId: Relic['id'] | null               // 当前选中的单件遗器 ID
  selectedRelicsIds: Array<Relic['id']>             // 当前选中的多件遗器 ID（批量操作用）
  valueColumns: ValueColumnField[]                   // 遗器列表显示哪些数值列
  excludedRelicPotentialCharacters: Array<CharacterId> // 排除在潜力计算之外的角色
  filters: RelicTabFilters                           // 当前所有过滤条件
  insightsMode: RelicInsights                        // 洞察面板显示哪个视图
  insightsCharacters: InsightCharacters              // 洞察面板统计哪些角色
}

// ── 操作层：修改状态的所有方法 ──
// 与 StateValues 拆开定义，最终合并为 RelicsTabStore，结构更清晰
interface RelicsTabStateActions {
  setFocusCharacter: (character: RelicsTabStateValues['focusCharacter']) => void                    // 设置聚焦角色
  setSelectedRelicsIds: (relic: RelicsTabStateValues['selectedRelicsIds']) => void                 // 设置选中的遗器列表
  setValueColumns: (cols: RelicsTabStateValues['valueColumns']) => void                            // 设置显示的数值列
  setExcludedRelicPotentialCharacters: (characters: RelicsTabStateValues['excludedRelicPotentialCharacters']) => void // 设置排除潜力计算的角色

  setFilters: (filters: RelicsTabStateValues['filters']) => void                                   // 整体替换过滤条件
  setFilter: <T extends keyof RelicsTabStateValues['filters']>(key: T) => (value: RelicsTabStateValues['filters'][T]) => void // 修改 filters 中单个字段（柯里化：先传 key 再传 value）
  resetFilters: () => void                                                                         // 重置所有过滤条件为默认值

  setInsightsMode: (mode: RelicInsights) => void                                                   // 切换洞察面板视图（Buckets/Top10/ESTBP）
  setInsightsCharacters: (mode: InsightCharacters) => void                                         // 切换洞察统计范围（全部/自定义/已拥有）
}

// store 的完整类型 = 数据层 & 操作层，传给 createTabAwareStore 使用
type RelicsTabState = RelicsTabStateActions & RelicsTabStateValues

const useRelicsTabStore = createTabAwareStore<RelicsTabState>((set, get) => ({
  ...defaultState, // 展开默认值，初始化所有数据层字段

  // 输入：角色ID | null  逻辑：直接覆盖  输出：focusCharacter 更新
  setFocusCharacter: (focusCharacter) => set({ focusCharacter }),

  // 输入：遗器ID数组  逻辑：取最后一个为单选ID，内容未变则跳过防止无效渲染  输出：selectedRelicId + selectedRelicsIds 同时更新
  setSelectedRelicsIds: (ids) => {
    const newSelectedId = ids.at(-1) ?? null
    const currentIds = get().selectedRelicsIds
    // Skip no-op updates to avoid unnecessary re-renders from new array spreads
    if (
      newSelectedId === get().selectedRelicId
      && ids.length === currentIds.length
      && ids.every((id, i) => id === currentIds[i])
    ) return
    return set({ selectedRelicId: newSelectedId, selectedRelicsIds: [...ids] })
  },

  // 输入：列字段数组  逻辑：展开创建新数组（避免引用共享）  输出：valueColumns 更新
  setValueColumns: (cols) => set({ valueColumns: [...cols] }),

  // 输入：角色ID数组  逻辑：展开创建新数组  输出：excludedRelicPotentialCharacters 更新
  setExcludedRelicPotentialCharacters: (excludedRelicPotentialCharacters) => set({ excludedRelicPotentialCharacters: [...excludedRelicPotentialCharacters] }),

  // 输入：完整 filters 对象  逻辑：整体替换  输出：filters 更新
  setFilters: (filters) => set({ filters }),

  // 输入：filters 的某个 key，再传对应 value（柯里化两步调用）  逻辑：展开旧 filters 只替换指定字段  输出：filters 单字段更新
  setFilter: (key) => (value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),

  // 输入：无  逻辑：深拷贝 defaultState.filters 防止引用污染  输出：filters 重置为初始空数组状态
  resetFilters: () => set({ filters: clone(defaultState.filters) }),

  // 输入：RelicInsights 枚举值  逻辑：直接覆盖  输出：insightsMode 更新
  setInsightsMode: (insightsMode) => set({ insightsMode }),

  // 输入：InsightCharacters 枚举值  逻辑：直接覆盖  输出：insightsCharacters 更新
  setInsightsCharacters: (insightsCharacters) => set({ insightsCharacters }),
}))

export { useRelicsTabStore }
