// i18next：国际化库，用于在 beta 角色中直接读取提示文字（见 betaContent）
import i18next from 'i18next' 
// 焚曜骑士套装的叠层 ATK 加成计算工具：
//   single(w)         — 描述一次打单体目标的攻击，权重为 w
//   aoe(w)            — 描述一次打全体目标的攻击，权重为 w
//   ashblazingMulti   — 接收完整打击序列，返回"以敌人数量为参数"的加成系数函数
// 焚曜套装每次追击命中都会叠 ATK 层，单体/群体叠层速率不同，需要精确模拟才能算准
// 注：Gilgamesh 的 ult 焚曜计算当前已注释掉（beta 阶段待确认），import 留存备用
import {
  aoe,
  ashblazingMulti,
  single,
} from 'lib/conditionals/ashblazingCompute'
// Saber：双重用途
//   1. simulation 中作为标准队友（Gilgamesh 的推荐搭档）
//   2. actionDefinition 中通过 teammateMatchesId 检测 Saber 是否在队，
//      Gilgamesh 的追击(FUA)只有在 Saber 存在时才触发伤害
import { Saber } from 'lib/conditionals/character/1000/Saber'
// HuohuoB1、MortenaxBlade：simulation 中的标准队友，用于 DPS 评分的基准战斗场景
import { HuohuoB1 } from 'lib/conditionals/character/1200/HuohuoB1'
import { MortenaxBlade } from 'lib/conditionals/character/1500/MortenaxBlade'
// 焚曜套装 ATK 加成的最终修正函数，分 CPU / GPU 两套实现：
//   boostUltAshblazingAtk    — CPU 路径，在 finalizeCalculations 中调用，
//                              检测到装备了焚曜套装时，用精确叠层系数修正 ULT 的 ATK 加成
//   gpuBoostUltAshblazingAtk — GPU 路径，在 newGpuFinalizeCalculations 中调用，
//                              返回 WGSL 着色器代码字符串，供 WebGPU 并行计算使用
// 注：Gilgamesh 的相关调用当前已注释掉（beta 待确认），import 留存备用
import {
  boostUltAshblazingAtk,
  gpuBoostUltAshblazingAtk,
} from 'lib/conditionals/conditionalFinalizers'
// 通用条件工具，每个角色文件几乎都会用到：
//   AbilityEidolon      — 预设的命座→技能升级映射表，
//                         如 SKILL_BASIC_3_ULT_TALENT_5 表示技能/普攻在 E3 升级、终结/天赋在 E5 升级，
//                         解构出 basic/skill/ult/talent 后调用 skill(e, 普通值, 升级值) 自动返回当前命座对应的倍率
//   type Conditionals   — TypeScript 类型，把 ContentDefinition 的 key 映射为 number（开关为 0/1，滑块为具体值），
//                         用于从 action.characterConditionals 读取用户当前设置的条件值
//   type ContentDefinition — TypeScript 类型，约束 content 对象的结构，确保每个条件项都有 id/formItem/text 等字段
//   createEnum          — 生成实体枚举对象，如 createEnum('Gilgamesh') => { Gilgamesh: 'Gilgamesh' }，
//                         用于标识角色本体、召唤物、记忆灵等实体
//   teammateMatchesId   — 检测队伍中有多少位队友的 ID 与指定值匹配，返回匹配数量（0–3），
//                         Gilgamesh 用它判断 Saber 是否在队以决定 FUA 是否触发
import {
  AbilityEidolon,
  type Conditionals,
  type ContentDefinition,
  createEnum,
  teammateMatchesId,
} from 'lib/conditionals/conditionalUtils'
// 攻击定义建造器（Builder 模式），用于在 actionDefinition 中描述每一次"击打"的完整信息。
// 每种技能类型有对应的预设工厂方法（standardBasic/standardSkill/standardUlt/standardFua/standardBreak/heal/shield 等），
// 链式调用设置属性：.damageElement(元素) .atkScaling(倍率) .toughnessDmg(韧性伤害) .build()
// 好处：类型安全，必填项缺失时 TypeScript 会直接报错
import { HitDefinitionBuilder } from 'lib/conditionals/hitDefinitionBuilder'
// simulation 中各角色所用的光锥（每个角色对应一把）：
//   IAmAsYouBehold      — Gilgamesh 本人的默认光锥（见文件末尾 defaultLightCone）
//   AThanklessCoronation — Saber 在 simulation 中使用的光锥
//   ReforgedInHellfire  — MortenaxBlade 在 simulation 中使用的光锥
//   NightOfFright       — HuohuoB1 在 simulation 中使用的光锥
import { AThanklessCoronation } from 'lib/conditionals/lightcone/5star/AThanklessCoronation'
import { IAmAsYouBehold } from 'lib/conditionals/lightcone/5star/IAmAsYouBehold'
import { NightOfFright } from 'lib/conditionals/lightcone/5star/NightOfFright'
import { ReforgedInHellfire } from 'lib/conditionals/lightcone/5star/ReforgedInHellfire'
// 全局常量，几乎每个角色文件都会用到：
//   CURRENT_DATA_VERSION — 当前数据版本字符串（如 '4.4v2'），
//                          beta 角色用它拼出 UI 警告："数值可能变动"
//   Parts  — 遗器部位枚举：{ Head, Hands, Body, Feet, PlanarSphere, LinkRope }
//            用于 scoring.parts 中指定每个部位推荐的主词条
//   Sets   — 遗器套装名称枚举，如 Sets.PioneerDiverOfDeadWaters，
//            用于 simulation.relicSets 中指定推荐套装，或在 buff 逻辑中检测是否穿着特定套装
//   Stats  — 属性名映射：{ ATK_P: 'ATK%', CR: 'CRIT Rate', CD: 'CRIT DMG', SPD: 'SPD', ... }
//            用于 scoring.stats 中设置属性权重，以及 parts 中指定主词条类型
import {
  CURRENT_DATA_VERSION,
  Parts,
  Sets,
  Stats,
} from 'lib/constants/constants'

// optimization/ 是整个优化器的核心计算层，负责把角色配置转化为实际数值
// 以下所有导入都来自这一层的不同子模块：

// Source — Buff 来源标识工厂，用于在调试面板中追踪"这个 buff 从哪来"
//   Source.character(id) 返回一组 SOURCE_* 标识符（SOURCE_E1/SOURCE_TRACE/SOURCE_SKILL 等），
//   调用 x.buff(..., x.source(SOURCE_E1)) 时，UI 上能显示"来自 E1"而不是一个匿名数字
import { Source } from 'lib/optimization/buffSource'

// StatKey — 优化器内部使用的属性 key 枚举（等同于 AKey），
//   是 x.buff() 第一个参数的合法值，如 StatKey.ATK_P / StatKey.CR / StatKey.CD
//   区别于 Stats（Stats 是面向用户的字符串，StatKey 是面向计算引擎的枚举）
import { StatKey } from 'lib/optimization/engine/config/keys'

// 三个位标志枚举，用二进制位运算表示"类型集合"，可以用 | 组合：
//   DamageTag — 伤害类型：BASIC=1, SKILL=2, ULT=4, FUA=8, DOT=16, BREAK=32 ...
//               x.damageType(DamageTag.ULT) 表示"只对终结技伤害生效"
//               DamageTag.BASIC | DamageTag.ULT 表示"对普攻和终结技都生效"
//   ElementTag — 伤害属性：Lightning=8, Wind=16, Fire=2 ...
//                在 HitDefinitionBuilder 中指定这次攻击的属性
//   TargetTag  — Buff 作用目标：Self=1, FullTeam=16, Memosprite=4 ...
//                x.targets(TargetTag.FullTeam) 表示"给全队施加这个 buff"
import {
  DamageTag,
  ElementTag,
  TargetTag,
} from 'lib/optimization/engine/config/tag'

// ComputedStatsContainer — 优化器在每次计算中维护的"当前角色属性快照"对象，
//   是 precomputeEffectsContainer / finalizeCalculations 等函数的第一个参数 x 的类型，
//   提供 x.buff() / x.source() / x.targets() / x.damageType() 等方法来施加 buff
import { type ComputedStatsContainer } from 'lib/optimization/engine/container/computedStatsContainer'

// AbilityKind — 技能种类枚举：BASIC / SKILL / ULT / FUA / BREAK / DOT / HEAL / SHIELD ...
//               用于 actionDeclaration（声明角色有哪些技能）
//               和 actionDefinition（定义每个技能的具体打击内容）
//
// 以下常量是 simulation.comboTurnAbilities 用到的"连招序列元素"，
// 描述 DPS 评分时模拟的标准连招顺序。格式为 [时机标记]_[技能种类]：
//   时机标记（TurnMarker）影响 buff 的结算时间：
//     DEFAULT  = 正常时机（buff 在整个技能期间生效）
//     START    = buff 在此技能开始时触发（如先读 buff 再打伤害）
//     END      = buff 在此技能结束时失效（最后一次吃到 buff）
//     WHOLE    = buff 覆盖整个技能全程
//
//   NULL_TURN_ABILITY_NAME — 空转（占位用，不计算任何伤害，模拟"等技能冷却"的一回合）
//   START_ULT  — 终结技（START 时机：先触发终结技的起始 buff 再计算伤害）
//   END_SKILL  — 战技（END 时机：战技 buff 在此动作后失效）
//   END_BASIC  — 普攻（END 时机）
//   DEFAULT_FUA — 追击（标准时机）
//   DEFAULT_SKILL — 战技（标准时机）
//   WHOLE_SKILL — 战技（WHOLE 时机：buff 覆盖战技全程）
import {
  AbilityKind,
  DEFAULT_FUA,
  DEFAULT_SKILL,
  END_BASIC,
  END_SKILL,
  NULL_TURN_ABILITY_NAME,
  START_ULT,
  WHOLE_SKILL,
} from 'lib/optimization/rotation/turnAbilityConfig'

// SortOption — 优化器结果表格的排序列枚举（BASIC / SKILL / ULT / FUA / DOT / HEAL ...），
//   scoring.sortOption 设置默认排序列（Gilgamesh 默认按 SKILL 排序），
//   scoring.hiddenColumns 隐藏不相关的列，
//   scoring.addedColumns 额外显示某列（如 Gilgamesh 额外显示 FUA 列）
import { SortOption } from 'lib/optimization/sortOptions'
// ─── lib/scoring/ ────────────────────────────────────────────────────────────
// scoring/ 负责"遗器评分"相关的逻辑：
//   给每套遗器打分、生成 DPS 基准参考值、管理推荐套装预设

// PresetEffects — "一键应用推荐套装条件"的预设定义，
//   对应 UI 上优化器里的"Apply Preset"按钮。
//   用户点击后，程序读取这里的预设，自动把对应套装的条件开关/滑块设为推荐值。
//   两种形式：
//     固定预设（如 PRISONER_SET）— 套装条件固定设为某个值
//     函数预设（如 fnAshblazingSet(8)）— 套装条件设为传入的参数值，
//       由角色文件决定推荐叠几层（Gilgamesh 用 fnMortenaxAshblazingSet(8)，叠8层）
import { PresetEffects } from 'lib/scoring/presetEffects'

// SPREAD_RELICS_4P_GENERAL_CONDITIONALS / SPREAD_ORNAMENTS_2P_GENERAL_CONDITIONALS
//   是 simulation.relicSets / ornamentSets 中用 ... 展开的"备选套装列表"。
//   评分系统对比时，只要用户装备的套装出现在这个列表里就视为"合法替代套装"，
//   不会因为没穿推荐套装而被扣分。
//   GENERAL_CONDITIONALS 是通用输出角色的备选套装集合；
//   类似的还有 SPREAD_RELICS_4P_HEAL（治疗）、SPREAD_ORNAMENTS_2P_FUA（追击）等分类变体
import {
  SPREAD_ORNAMENTS_2P_GENERAL_CONDITIONALS,
  SPREAD_RELICS_4P_GENERAL_CONDITIONALS,
} from 'lib/scoring/scoringConstants'

// ─── types/ ──────────────────────────────────────────────────────────────────
// types/ 只存放 TypeScript 类型定义（interface / type），不含任何运行时逻辑。
// 加 "type" 关键字的导入在编译后会被完全擦除，零运行时开销。
// 作用：让 TypeScript 在写代码时检查结构是否正确，防止漏填字段或写错类型。

// Eidolon — 命座等级的类型别名，本质就是 number（0–6），
//   是 conditionals 函数第一个参数 e 的类型
import { type Eidolon } from 'types/character'

// CharacterConfig — 文件末尾 export const Gilgamesh 对象的类型，
//   规定必须包含 id / defaultLightCone / display / conditionals / scoring 这几个字段
import { type CharacterConfig } from 'types/characterConfig'

// CharacterConditionalsController — conditionals 函数返回值的接口类型，
//   规定返回的对象必须实现 content / defaults / actionDeclaration / actionDefinition /
//   precomputeEffectsContainer / finalizeCalculations 等方法
import { type CharacterConditionalsController } from 'types/conditionals'

// ScoringMetadata    — scoring() 函数返回值的类型，
//   规定必须包含 stats（属性权重）/ parts（主词条推荐）/ sortOption 等字段
// SimulationMetadata — simulation() 函数返回值的类型，
//   规定必须包含 parts / substats / comboTurnAbilities / relicSets / teammates 等字段
import {
  type ScoringMetadata,
  type SimulationMetadata,
} from 'types/metadata'

// OptimizerAction — 优化器每次计算时传入回调函数的"动作快照"，
//   包含用户当前设置的所有条件值（characterConditionals / lightConeConditionals）、
//   当前计算的技能类型（actionType）、预计算好的属性容器（precomputedStats）等。
//   在 precomputeEffectsContainer / actionDefinition 里通过它读取用户条件：
//     const r = action.characterConditionals as Conditionals<typeof content>
//
// OptimizerContext — 优化器计算时的"静态上下文"，在一次优化搜索期间不变，
//   包含：敌人数量（enemyCount）、队伍角色的命途/属性/角色ID、
//         角色基础能量上限（baseEnergy）等全局信息。
//   在需要感知队伍构成的 buff 逻辑里使用，如 a6 能量加成计算：
//     const a6EnergyBonus = Math.min(1.00, Math.max(0, context.baseEnergy - 100) * 0.01)
import {
  type OptimizerAction,
  type OptimizerContext,
} from 'types/optimizer'

// 实体枚举：createEnum('Gilgamesh') 返回 { Gilgamesh: 'Gilgamesh' }
// 用途：在 entityDefinition 里用 GilgameshEntities.Gilgamesh 作为 key，
// 避免多处硬写字符串 'Gilgamesh'，改名时只需改这一处。
// 若角色有召唤物或忆灵，需传多个参数，如 createEnum('Evanescia', 'Memo')
export const GilgameshEntities = createEnum('Gilgamesh')

// 技能种类列表：声明 Gilgamesh 参与计算的所有伤害类型。
// 作用有两个：
//   1. 告诉优化器需要计算并展示哪几列结果（每项对应结果表中的一列）
//   2. actionDefinition 里必须为列表中的每一项提供对应的 hits 定义
// 不在列表中的类型（如 DOT / HEAL）不会被计算，对应列也不会出现。
// BASIC  — 普攻
// SKILL  — 战技
// ULT    — 终结技
// FUA    — 追击（Gilgamesh 与 Saber 组队时触发的联合追击）
// BREAK  — 弱点击破伤害
export const GilgameshAbilities: AbilityKind[] = [
  AbilityKind.BASIC,
  AbilityKind.SKILL,
  AbilityKind.ULT,
  AbilityKind.FUA,
  AbilityKind.BREAK,
]

// ─── conditionals ────────────────────────────────────────────────────────────
// 【核心计算块】整个文件最复杂的部分，是一个工厂函数，每次优化器需要这个角色的逻辑时调用。
// 参数：
//   e           — 当前命座等级（0~6），用于决定技能倍率和哪些 buff 生效
//   withContent — 是否需要生成 UI 文字，优化计算时传 false 跳过 i18n 提升性能
// 返回：CharacterConditionalsController 对象，包含以下内容：
//   content / defaults          — UI 条件开关和滑块的定义与默认值
//   teammateContent / teammateDefaults — 作为队友时暴露给他人的条件
//   entityDeclaration/Definition — 声明角色实体（本体/召唤物/忆灵）
//   actionDeclaration/Definition — 声明并定义每个技能的打击内容（倍率/属性/韧性伤害）
//   precomputeEffectsContainer  — 施加角色自身的 buff（ATK/CD/RES PEN 等）
//   precomputeMutualEffectsContainer — 施加影响队友的 buff
//   finalizeCalculations        — 最终修正（处理需要所有属性确定后才能算的特殊效果）
const conditionals = (e: Eidolon, withContent: boolean): CharacterConditionalsController => {
  // ── i18next 国际化系统 ───────────────────────────────────────────────────────
  // i18next 的核心工作方式：
  //   所有 UI 文字都不硬编码在 TS 里，而是存放在 public/locales/{语言}/conditionals.yaml 里，
  //   运行时根据用户选择的语言自动加载对应的 YAML 文件，调用 t() 函数按 key 查文字。
  //
  // 文字存储结构（YAML 示例）：
  //   en_US/conditionals.yaml:
  //     BetaMessage: 'Current version: {{Version}} - Calculations are subject to change.'
  //   zh_CN/conditionals.yaml:
  //     BetaMessage: '当前版本：{{Version}} - 计算结果可能会发生变化。'
  //
  // t() 函数调用方式：
  //   i18next.t('key', { ns: '命名空间', 插值变量名: 值 })
  //     - key       — YAML 文件里的路径（支持嵌套，如 'Characters.Acheron.Content.foo.text'）
  //     - ns        — namespace，对应哪个 YAML 文件（'conditionals' → conditionals.yaml）
  //     - 插值变量  — YAML 里的 {{Version}} 会被替换为传入的 Version 值
  //
  // beta 角色 vs 正式角色的 i18n 方式不同：
  //   beta 角色（本文件）：
  //     直接调用 i18next.t()，所有条件 tooltip 统一显示同一条 beta 警告
  //   正式角色（如 Acheron）：
  //     使用 wrappedFixedT(withContent).get(null, 'conditionals', 'Characters.Acheron')
  //     得到一个绑定了命名空间和前缀的 t 函数，每个条件显示各自专属的技能描述文字
  //     wrappedFixedT 的性能优化：withContent=false 时返回空函数直接返回 ''，
  //     跳过 i18n 查询，优化器跑数万次计算时不需要生成 UI 文字，节省大量时间
  //
  // 本行：查询 'conditionals' 命名空间下的 BetaMessage，并把版本号插入 {{Version}}
  // 结果示例（英文）：'Current version: 4.4v2 - Calculations are subject to change.'
  const betaContent = i18next.t('BetaMessage', { ns: 'conditionals', Version: CURRENT_DATA_VERSION })
  // ── 命座技能升级模板（柯里化） ────────────────────────────────────────────────
  // AbilityEidolon 是预设模板集合，每个模板对应一种"E3/E5 分别升哪两个技能"的组合。
  // SKILL_BASIC_3_ULT_TALENT_5 表示：战技/普攻在 E3 升级，终结/天赋在 E5 升级。
  //
  // 解构出的 basic / skill / ult / talent 都是柯里化函数，由 ability(n) 生成：
  //   ability(n) 第一次调用：传入命座阈值 n，返回一个新函数（T/K 此时未定）
  //   新函数第二次调用：basic(e, 普通值, 升级值) → 根据 e 返回对应倍率
  //     e < n  → 返回普通值（T），e >= n → 返回升级值（K）
  //     返回类型是 T | K，精确保留两个字面量类型，不丢失精度
  //
  // 用法示例（见下方倍率定义）：
  //   const basicScaling = basic(e, 1.00, 1.10)
  //   → e < 3 时得到 1.00，e >= 3 时得到 1.10
  const { basic, skill, ult, talent } = AbilityEidolon.SKILL_BASIC_3_ULT_TALENT_5

  // ── Buff 来源标签 ─────────────────────────────────────────────────────────────
  // Source.character(id) 返回一组标签对象，每个对象记录"这个 buff 来自哪个能力"，结构如下：
  //   SOURCE_E1 = { id: '1509', label: '1509_E1', ability: 'E1', buffType: 'CHARACTER' }
  //
  // 用途：作为 x.buff() 的第三个参数，让优化器的 Buff 分析面板能追踪每条属性的来源。
  //   x.buff(StatKey.ATK_P, 0.25, x.source(SOURCE_E1))
  //   → 面板显示："这 25% ATK% 来自 Gilgamesh E1"
  //
  // 这里之所以提前解构：后续 precomputeEffectsContainer 会频繁使用，
  // 避免每次都写 Source.character(Gilgamesh.id).SOURCE_E1 这样的长链。
  //
  // 跳过 E3/E5：崩铁中 E3/E5 只升级技能等级（倍率提升），不触发额外 buff，用不到对应标签。
  const {
    SOURCE_BASIC,
    SOURCE_SKILL,
    SOURCE_ULT,
    SOURCE_TALENT,
    SOURCE_TECHNIQUE,
    SOURCE_TRACE,
    SOURCE_E1,
    SOURCE_E2,
    SOURCE_E4,
    SOURCE_E6,
  } = Source.character(Gilgamesh.id)

  // ── 技能倍率（Scaling）定义 ───────────────────────────────────────────────────
  // 这些数值来自游戏数据挖掘（datamine），由开发者手动录入，不存于 game_data.json。
  // 两者存储的数据性质不同，分工如下：
  //
  //   game_data.json（角色是什么）   │  角色 .ts 文件（角色怎么打）
  //   ─────────────────────────────────────────────────────────
  //   面板基础数值（HP/ATK/DEF/SPD）  │  技能倍率（basicScaling, skillScaling…）
  //   命迹小图节点加成（traceTree）   │  命座效果逻辑
  //   大命途追加属性（traces）        │  Buff 计算逻辑
  //   能量上限（max_sp）             │  战斗条件判断
  //
  // 每行格式：skill/basic/ult/talent(e, 普通值, E3或E5升级后的值)
  //   → 运行时根据当前命座 e 自动返回对应倍率，无需 if/else
  //
  // 同一个技能可以拆出多个倍率常量（如 skill 同时有伤害倍率和无视防御值），
  // 因为它们在计算中承担不同职责，分开命名便于后续 buff 逻辑直接引用。
  const basicScaling = basic(e, 1.00, 1.10)

  const skillScaling = skill(e, 2.00, 2.20) // Primary target only, adjacent Blast not modeled
  const skillDefIgnoreValue = skill(e, 0.30, 0.33)

  const ultScaling = ult(e, 4.00, 4.40)
  const ultBounceScaling = ult(e, 0.40, 0.44)

  // Gilgamesh's Lightning portion only
  const jointFuaScaling = talent(e, 2.00, 2.20)
  const talentUltDmgBuffValue = talent(e, 0.40, 0.44)

  // 1 AoE + 10 bounces
  // const ultHitMulti = ashblazingMulti([
  //   aoe(ultScaling),
  //   ...Array(ultBounceCount).fill(single(ultBounceScaling)),
  // ])

  // ── 条件默认值 & UI 配置 ──────────────────────────────────────────────────────
  // defaults      — 每个条件的初始值（滑块默认位置 / 开关默认开闭）
  // content       — 每个条件的 UI 组件配置（控件类型、显示文字、范围等）
  //                 ContentDefinition<typeof defaults> 确保两者 key 完全一致
  //
  // 角色有两套独立的条件面板：
  //   主角色面板（defaults / content）
  //     → Gilgamesh 作为被优化角色时显示，包含自身增伤条件（interestStacks、kingsBurden）
  //   队友面板（teammateDefaults / teammateContent）
  //     → Gilgamesh 作为队友放进队伍栏时显示，只保留会影响其他角色的 buff：
  //         a6TeamBuff     — A6 大秘技节点全队 buff（满级均可解锁）
  //         kingsAcknowledgement — 给队友的 buff，需 E1 才生效，disabled: e < 1
  //         e6ResPen       — E6 命座抗性穿透，disabled: e < 6
  //     自身专属条件（interestStacks、kingsBurden）不影响队友，不在此显示
  const defaults = {
    interestStacks: 12,
    kingsAcknowledgement: true,
    kingsBurden: true,
    a6TeamBuff: true,
    e6ResPen: true,
  }

  const teammateDefaults = {
    a6TeamBuff: true,
    kingsAcknowledgement: true,
    e6ResPen: true,
  }

  const content: ContentDefinition<typeof defaults> = {
    interestStacks: {
      id: 'interestStacks',
      formItem: 'slider',
      text: 'Interest stacks',
      content: betaContent,
      min: 0,
      max: 12,
    },
    kingsAcknowledgement: {
      id: 'kingsAcknowledgement',
      formItem: 'switch',
      text: 'King\'s Acknowledgement',
      content: betaContent,
    },
    kingsBurden: {
      id: 'kingsBurden',
      formItem: 'switch',
      text: 'King\'s Burden',
      content: betaContent,
    },
    a6TeamBuff: {
      id: 'a6TeamBuff',
      formItem: 'switch',
      text: 'Hegemon\'s Strife',
      content: betaContent,
    },
    e6ResPen: {
      id: 'e6ResPen',
      formItem: 'switch',
      text: 'E6 RES PEN',
      content: betaContent,
      disabled: e < 6,
    },
  }

  const teammateContent: ContentDefinition<typeof teammateDefaults> = {
    a6TeamBuff: content.a6TeamBuff,
    kingsAcknowledgement: {
      ...content.kingsAcknowledgement,
      disabled: e < 1,
    },
    e6ResPen: content.e6ResPen,
  }

  // ── CharacterConditionalsController 返回对象 ────────────────────────────────
  // conditionals 函数的返回值实现了 CharacterConditionalsController 接口，
  // 优化器通过这个对象驱动整个计算流水线：
  //
  //  UI 层
  //    content / defaults             → 主角色面板的条件控件和初始值
  //    teammateContent / teammateDefaults → 队友面板的条件控件和初始值
  //
  //  实体 & 动作声明（simulation 用）
  //    entityDeclaration / entityDefinition → 声明角色本体（primary / summon / memosprite）
  //    actionDeclaration / actionDefinition → 声明技能种类，并定义每个技能的打击内容
  //                                           （每次命中的伤害属性、ATK 倍率、韧性伤害）
  //    actionModifiers                      → 动作修正（Gilgamesh 暂无，返回空数组）
  //
  //  计算流水线（按顺序执行）
  //    precomputeEffectsContainer      → 自身 buff（仅主角色）
  //    precomputeMutualEffectsContainer → 共享 buff（主角色和队友均触发，如全队 ATK/CD）
  //    precomputeTeammateEffectsContainer → 仅作为队友时对主角色施加的 buff（Gilgamesh 暂无）
  //    finalizeCalculations            → 所有属性锁定后的最终修正（CPU 路径）
  //    newGpuFinalizeCalculations      → 同上，返回 WGSL 字符串供 WebGPU 并行计算（GPU 路径）
  //
  //  其他
  //    dynamicConditionals             → 动态条件（依赖其他属性实时触发的 buff，Gilgamesh 暂无）
  return {
    content: () => Object.values(content),           // 主角色条件面板：把对象转成数组供 UI 渲染
    defaults: () => defaults,                        // 主角色条件初始值
    teammateContent: () => Object.values(teammateContent), // 队友面板条件（仅显示影响队友的 buff）
    teammateDefaults: () => teammateDefaults,        // 队友面板初始值

    entityDeclaration: () => Object.values(GilgameshEntities), // 声明本文件涉及的实体列表（供引擎注册）
    entityDefinition: (action: OptimizerAction, context: OptimizerContext) => ({
      [GilgameshEntities.Gilgamesh]: {
        primary: true,    // 本体，参与伤害计算
        summon: false,    // 非召唤物
        memosprite: false, // 非记忆灵
      },
    }),

    actionDeclaration: () => [...GilgameshAbilities], // 声明角色拥有哪些技能种类（BASIC/SKILL/ULT/FUA/BREAK）
    actionDefinition: (action: OptimizerAction, context: OptimizerContext) => {
      const hasSaber = teammateMatchesId(context, Saber.id) > 0 // 检测队伍中是否有 Saber，FUA 仅在 Saber 在队时触发
      // E2: Skill primary +30%
      const skillTotalScaling = skillScaling + (e >= 2 ? 0.30 : 0) // E2 为战技主目标额外增加 30% 倍率

      // E6: Ult bounce +20%
      const ultBounceTotalScaling = ultBounceScaling + (e >= 6 ? 0.20 : 0)            // E6 每次弹射额外 +20%
      const ultTotalScaling = ultScaling + ultBounceTotalScaling * 10 / context.enemyCount // 终结技总倍率 = 主体 + 10次弹射平摊到敌人数量
      const ultToughness = 40 + 2 * 10 / context.enemyCount                           // 终结技韧性伤害同理平摊

      // 每个技能用 [AbilityKind.XXX] 作为 key（计算属性名语法），值为 { hits: [...] }
      // hits 是数组，支持多段打击；每段用 HitDefinitionBuilder 链式构建：
      //   standardBasic/Skill/Ult/Fua/Break() — 预填该技能类型的默认字段（damageType、outputTag 等）
      //   .damageElement()  — 补充伤害属性（各角色不同，故不预填）
      //   .atkScaling()     — 补充攻击力倍率
      //   .toughnessDmg()   — 补充韧性伤害值
      //   .build()          — 结束链式调用，返回最终的 HitDefinition 对象
      // 底层用 Proxy 实现：每次 .方法() 都把值写入同一个 obj 并返回同一个 proxy，
      // .build() 时直接返回该 obj，无递归，无新建对象
      return {
        [AbilityKind.BASIC]: {                       // 普攻定义
          hits: [
            HitDefinitionBuilder.standardBasic()
              .damageElement(ElementTag.Lightning)   // 雷属性伤害
              .atkScaling(basicScaling)              // 攻击力倍率
              .toughnessDmg(10)                      // 韧性伤害 10
              .build(),
          ],
        },
        [AbilityKind.SKILL]: {                       // 战技定义
          hits: [
            HitDefinitionBuilder.standardSkill()
              .skillPointsUsed(0)                    // 不消耗战技点（Gilgamesh 战技回费）
              .damageElement(ElementTag.Lightning)
              .atkScaling(skillTotalScaling)         // 含 E2 加成的战技倍率
              .toughnessDmg(20)
              .build(),
          ],
        },
        [AbilityKind.ULT]: {                         // 终结技定义
          hits: [
            HitDefinitionBuilder.standardUlt()
              .damageElement(ElementTag.Lightning)
              .atkScaling(ultTotalScaling)           // 主体 + 弹射平摊后的总倍率
              .toughnessDmg(ultToughness)            // 韧性伤害同理
              .build(),
          ],
        },
        [AbilityKind.FUA]: {                         // 追击（FUA）定义
          hits: [
            HitDefinitionBuilder.standardFua()
              .damageElement(ElementTag.Lightning)
              .atkScaling(hasSaber ? jointFuaScaling : 0)  // 有 Saber 才触发追击，否则倍率为 0
              .toughnessDmg(hasSaber ? 20 : 0)             // 韧性伤害同理
              .build(),
          ],
        },
        [AbilityKind.BREAK]: {                       // 击破定义（固定公式，无需额外参数）
          hits: [
            HitDefinitionBuilder.standardBreak(ElementTag.Lightning).build(),
          ],
        },
      }
    },
    actionModifiers: () => [],                       // 动作修正（Gilgamesh 暂无）

    // ── 三个 precompute 函数的触发时机 ──────────────────────────────────────────
    // precomputeEffectsContainer      只在 Gilgamesh 作为【主角色】时执行 → 自身专属 buff
    // precomputeMutualEffectsContainer 无论作为主角色还是队友都执行      → 全队共享 buff
    // precomputeTeammateEffectsContainer 只在 Gilgamesh 作为【队友】时执行  → 定向给主角色的 buff
    precomputeEffectsContainer: (x: ComputedStatsContainer, action: OptimizerAction, context: OptimizerContext) => {
      const r = action.characterConditionals as Conditionals<typeof content> // 读取用户在主角色面板设置的条件值

      // x.buff(属性key, 数值, 来源) 的三个参数说明：
      //   属性key  — StatKey.XX，指定要加哪个属性，常用缩写：
      //     StatKey.HP        生命值（固定值）       StatKey.HP_P      生命值%
      //     StatKey.ATK       攻击力（固定值）       StatKey.ATK_P     攻击力%
      //     StatKey.DEF       防御力（固定值）       StatKey.DEF_P     防御力%
      //     StatKey.SPD       速度                  StatKey.SPD_P     速度%
      //     StatKey.CR        暴击率                StatKey.CD        暴击伤害
      //     StatKey.EHR       效果命中              StatKey.RES       效果抵抗
      //     StatKey.BE        击破特攻              StatKey.ERR       能量恢复效率
      //     StatKey.OHB       治疗量加成
      //     StatKey.BOOST     伤害加成（通用乘区）   StatKey.DEF_PEN   无视防御
      //     StatKey.RES_PEN   抗性穿透              StatKey.VULNERABILITY 易伤
      //   数值     — 加多少，0 表示条件不满足时"不加"（统一写法，避免 if/else）
      //   来源     — x.source(SOURCE_XX)，标记 buff 来自哪个能力，供调试面板追踪
      //              可附加链式修饰：
      //                .damageType(DamageTag.ULT)   — 只对终结技伤害生效
      //                .targets(TargetTag.FullTeam) — buff 作用于全队而非仅自身

      // A4: +10% CD per Interest stack
      x.buff(StatKey.CD, r.interestStacks * 0.10, x.source(SOURCE_TRACE))   // A4：每层兴趣叠加 10% 暴伤，来源标记为命途节点

      x.buff(StatKey.BOOST, (r.kingsBurden) ? talentUltDmgBuffValue : 0, x.damageType(DamageTag.ULT).source(SOURCE_TALENT)) // 天赋：王之重负激活时，终结技伤害加成

      // Self DEF ignore below E1; at E1+ the mutual container writes FullTeam instead
      x.buff(StatKey.DEF_PEN, (e < 1 && r.kingsAcknowledgement) ? skillDefIgnoreValue : 0, x.source(SOURCE_SKILL)) // E0：王之认可仅对自身无视防御；E1+ 改为 mutual 写全队

      // E1: +25% ATK while skill active
      x.buff(StatKey.ATK_P, (e >= 1 && r.kingsAcknowledgement) ? 0.25 : 0, x.source(SOURCE_E1)) // E1：战技激活时自身 +25% ATK

      x.buff(StatKey.ERR, (e >= 4) ? 0.20 : 0, x.source(SOURCE_E4))        // E4：能量恢复效率 +20%
    },

    precomputeMutualEffectsContainer: (x: ComputedStatsContainer, action: OptimizerAction, context: OptimizerContext) => {
      const m = action.characterConditionals as Conditionals<typeof teammateContent> // 读取队友面板条件值（作为主角或队友都会执行）

      // A6: +30% ATK/CD to team, +1% per Max Energy over 100 (capped at +100%)
      const a6EnergyBonus = Math.min(1.00, Math.max(0, context.baseEnergy - 100) * 0.01) // 超出 100 能量上限的部分每点 +1%，上限 +100%
      x.buff(StatKey.ATK_P, (m.a6TeamBuff) ? 0.30 + a6EnergyBonus : 0, x.targets(TargetTag.FullTeam).source(SOURCE_TRACE)) // A6：全队 ATK%
      x.buff(StatKey.CD, (m.a6TeamBuff) ? 0.30 + a6EnergyBonus : 0, x.targets(TargetTag.FullTeam).source(SOURCE_TRACE))   // A6：全队暴伤

      // E1: DEF ignore extends to team
      x.buff(StatKey.DEF_PEN, (e >= 1 && m.kingsAcknowledgement) ? skillDefIgnoreValue : 0, x.targets(TargetTag.FullTeam).source(SOURCE_SKILL)) // E1：王之认可无视防御扩展至全队

      x.buff(StatKey.RES_PEN, (e >= 6 && m.e6ResPen) ? 0.20 : 0, x.targets(TargetTag.FullTeam).source(SOURCE_E6)) // E6：全队抗性穿透 +20%
    },

    precomputeTeammateEffectsContainer: (x: ComputedStatsContainer, action: OptimizerAction, context: OptimizerContext) => {
      // Gilgamesh 作为队友时没有额外的单独 buff，留空
    },

    finalizeCalculations: (x: ComputedStatsContainer, action: OptimizerAction, context: OptimizerContext) => {
      // boostUltAshblazingAtk(x, action, ultHitMulti(context)) // 待确认：焚曜套 ULT 叠层修正（beta 阶段注释）
    },
    newGpuFinalizeCalculations: (action: OptimizerAction, context: OptimizerContext) => {
      return '' // GPU 路径暂无实现
      // return gpuBoostUltAshblazingAtk(action, ultHitMulti(context))
    },

    dynamicConditionals: [],                         // 动态条件（依赖属性实时触发的 buff，Gilgamesh 暂无）
  }
}

// ─── simulation ──────────────────────────────────────────────────────────────
// 【DPS 基准场景】定义评分系统用于计算"满分基准值"的标准战斗环境。
// 评分逻辑：先用这套固定配置跑一次模拟得到基准 DPS，再把用户实际装备和这个基准对比，
// 得出百分比评分（如 85 分 = 达到基准的 85%）。
// 包含：
//   parts       — 模拟时使用的主词条（如腰部 CR/CD/ATK%）
//   substats    — 副词条优先级顺序（CD > CR > ATK% > ATK）
//   comboTurnAbilities — 标准连招序列（描述一轮战斗打哪些技能、顺序如何）
//   relicSets / ornamentSets — 模拟用的推荐套装（+ 展开的备选套装列表）
//   teammates   — 固定队友配置（角色ID + 光锥 + 命座 + 叠影层数）
// 注：只有输出型角色有 simulation；治疗角色用 healSimulation，辅助角色通常没有
const simulation = (): SimulationMetadata => ({
  parts: {
    [Parts.Body]: [
      Stats.CR,
      Stats.CD,
      Stats.ATK_P,
    ],
    [Parts.Feet]: [
      Stats.ATK_P,
      Stats.SPD,
    ],
    [Parts.PlanarSphere]: [
      Stats.ATK_P,
      Stats.Lightning_DMG,
    ],
    [Parts.LinkRope]: [
      Stats.ATK_P,
    ],
  },
  substats: [
    Stats.CD,
    Stats.CR,
    Stats.ATK_P,
    Stats.ATK,
  ],
  comboTurnAbilities: [
    NULL_TURN_ABILITY_NAME, // 空转（等能量，不计伤害）
    START_ULT,              // 终结技（START 时机：先触发起始 buff 再算伤）
    END_SKILL,              // 战技（END 时机：战技 buff 在此动作后失效）
    DEFAULT_FUA,            // 追击（标准时机，仅 Saber 在队时有效）
    WHOLE_SKILL,            // 战技（WHOLE 时机：buff 覆盖战技全程）
    WHOLE_SKILL,            // 战技（再打一次）
    // TODO: verify rotation length
  ],
  errRopeEidolon: 0,        // 所有命座均使用 ERR 绳评分（Gilgamesh 需要频繁放终结技）
  deprioritizeBuffs: true,  // 搜索时降低 buff 类词条（效果命中、效果抵抗等）的优先级，优先考虑面板属性（暴击、攻击力等）
  relicSets: [
    // 推荐遗器套装列表：装备在列表内的套装视为合法，不扣评分
    [Sets.ScholarLostInErudition, Sets.ScholarLostInErudition], // 首选：博学4件套
    ...SPREAD_RELICS_4P_GENERAL_CONDITIONALS,                   // 备选：展开通用输出套装列表（先锋、囚徒等）
  ],
  ornamentSets: [
    // 推荐位面饰品套装列表（球+绳，共2件），同 relicSets 逻辑
    Sets.CosmicLifeSciencesInstitute,            // 首选位面饰品套装
    ...SPREAD_ORNAMENTS_2P_GENERAL_CONDITIONALS, // 备选：展开通用输出位面饰品列表
  ],
  teammates: [
    {
      characterId: Saber.id,
      lightCone: AThanklessCoronation.id,
      characterEidolon: 0,
      lightConeSuperimposition: 1,
    },
    {
      characterId: MortenaxBlade.id,
      lightCone: ReforgedInHellfire.id,
      characterEidolon: 0,
      lightConeSuperimposition: 1,
    },
    {
      characterId: HuohuoB1.id,
      lightCone: NightOfFright.id,
      characterEidolon: 0,
      lightConeSuperimposition: 1,
    },
  ],
})

// ─── scoring ─────────────────────────────────────────────────────────────────
// 【遗器评分配置】告诉评分系统"什么样的副词条对这个角色有价值"以及"UI 怎么显示"。
// 包含：
//   stats       — 每条副词条的权重（0~1），优化器用这个权重给遗器打分
//                 如 CR: 1, CD: 1 表示暴击率/伤害等权重最高，DEF: 0 表示完全不值钱
//   parts       — 每个部位推荐的主词条（按优先级排列）
//   presets     — 点击"Apply Preset"时自动设置的套装条件预设
//   sortOption  — 优化器结果表默认按哪个技能列排序（Gilgamesh 默认按 SKILL）
//   addedColumns   — 额外显示的列（Gilgamesh 额外显示 FUA 列）
//   hiddenColumns  — 隐藏不相关的列（如 DOT）
//   simulation  — 引用上面的 simulation() 结果，用于 DPS 基准评分
const scoring = (): ScoringMetadata => ({
  // 副词条权重（0~1）：遗器评分时，每条副词条得分 = 词条数值 × 权重
  // 1 = 最高价值，0.75 = 次要价值，0 = 对该角色无用
  stats: {
    [Stats.ATK]: 0.75,  // 固定攻击力略低于百分比攻击
    [Stats.ATK_P]: 0.75,
    [Stats.DEF]: 0,     // 防御/生命/效果相关对输出角色无意义
    [Stats.DEF_P]: 0,
    [Stats.HP]: 0,
    [Stats.HP_P]: 0,
    [Stats.SPD]: 1,     // 速度：高价值（加快终结技循环）
    [Stats.CR]: 1,      // 暴击率：最高价值
    [Stats.CD]: 1,      // 暴击伤害：最高价值
    [Stats.EHR]: 0,
    [Stats.RES]: 0,
    [Stats.BE]: 0,
  },
  // 主词条推荐列表（评判玩家实际遗器用），与 simulation.parts 看似相同但用途不同：
  //   simulation.parts → 模拟基准时假设用什么主词条（跑出理想 DPS）
  //   scoring.parts    → 评分时检查玩家实际遗器主词条是否合格
  //
  // 扣分规则示例（Body 部位推荐 CR / CD / ATK_P）：
  //   玩家 Body 主词条 = 暴击伤害   → 在列表中 ✓ 主词条满分
  //   玩家 Body 主词条 = 治疗量加成 → 不在列表 ✗ 主词条得 0 分，该部位评分大幅下降
  // 注：具体扣分比例由 lib/scoring/scoringService.ts 计算，主词条占单件遗器评分的较大权重
  parts: {
    [Parts.Body]: [
      Stats.CR,
      Stats.CD,
      Stats.ATK_P,
    ],
    [Parts.Feet]: [
      Stats.ATK_P,
      Stats.SPD,
    ],
    [Parts.PlanarSphere]: [
      Stats.ATK_P,
      Stats.Lightning_DMG,
    ],
    [Parts.LinkRope]: [
      Stats.ATK_P,
      Stats.ERR,
    ],
  },
  presets: [
    // UI 中"Apply Preset"按钮的预设：点击后自动把套装条件设为推荐值
    // fnMortenaxAshblazingSet(8) — 焚曜骑士套装叠层自动设为 8（开发者测算的实战均值）
    // fn 前缀表示函数形式预设（可传参），区别于 PRISONER_SET 这类固定值预设
    PresetEffects.fnMortenaxAshblazingSet(8),
  ],
  defaultDamageType: DamageTag.SKILL,  // 结果面板默认展示战技伤害数字
  sortOption: SortOption.SKILL,        // 结果列表默认按战技伤害从高到低排序
  addedColumns: [
    SortOption.FUA,   // 额外显示追击列（Gilgamesh 有追击伤害，需单独查看）
    // 最终显示列：BASIC / SKILL / ULT / FUA（默认列 + 追加列）
  ],
  hiddenColumns: [
    SortOption.DOT,   // 隐藏持续伤害列（Gilgamesh 无 DOT 机制，显示无意义）
    // 最终隐藏列：DOT（其余列正常显示）
  ],
  simulation: simulation(), // 立即执行 simulation() 并传入结果（注意带括号，不是传函数本身）
})

// ─── display ─────────────────────────────────────────────────────────────────
// 【UI 展示参数】控制角色立绘在各个界面的显示效果，纯视觉配置，不参与任何计算。
// imageCenter — 立绘在展示卡片中的位置和缩放（x/y 偏移，z 缩放比例）
// showcaseColor — 展示卡片的主题色（十六进制颜色值）
// 可选字段（Gilgamesh 未用到）：
//   spineCenter  — Spine 骨骼动画的中心点（有 Spine 动画的角色才需要）
//   disableSpine — 禁用 Spine 动画，改用静态立绘（旧角色常见）
const display = {
  imageCenter: { x: 1102, y: 943, z: 1.11 },
  showcaseColor: '#867fb3',
}

// ─── export const Gilgamesh ───────────────────────────────────────────────────
// 【最终导出对象】整合以上所有内容，是 characterConfigRegistry 自动扫描并注册的目标。
// id            — 游戏内角色 ID，必须与 game_data.json 中的 key 一致
// defaultLightCone — 优化器页面默认选中的光锥
// display       — 引用上面的 display 对象
// conditionals  — 引用上面的 conditionals 函数（注意：是函数本身，不是调用结果）
// scoring       — 用 getter 包装，每次访问都重新执行 scoring()，
//                 避免多个角色实例共享同一个对象引用导致数据污染
export const Gilgamesh: CharacterConfig = {
  id: '1509',
  defaultLightCone: IAmAsYouBehold.id,
  display,
  conditionals,
  get scoring() {
    return scoring()
  },
}
