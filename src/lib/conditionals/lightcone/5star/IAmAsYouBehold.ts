import i18next from 'i18next' // beta 角色/光锥读取 BetaMessage 提示文字

// type 前缀 = 纯类型导入，编译后完全消失，不产生任何运行时代码
// ContentDefinition<typeof defaults> — 约束 content 对象的结构（key 与 defaults 一致，value 为 UI 控件配置）
// Conditionals<typeof content>       — 把 content 的 key 映射为 number，用于读取用户设置的条件值
import {
  type Conditionals,
  type ContentDefinition,
} from 'lib/conditionals/conditionalUtils'
import { CURRENT_DATA_VERSION } from 'lib/constants/constants' // 当前数据版本，用于拼 beta 提示文字
import { Source } from 'lib/optimization/buffSource'           // Buff 来源标签工厂，光锥用 Source.lightCone(id)
import { StatKey } from 'lib/optimization/engine/config/keys' // 属性 key 枚举（ATK_P / CR / CD / ERR 等）
import {
  DamageTag, // 伤害类型位标志（BASIC / SKILL / ULT / FUA ...），可用 | 组合
  TargetTag, // Buff 作用目标（Self / FullTeam / Memosprite ...）
} from 'lib/optimization/engine/config/tag'
import { type ComputedStatsContainer } from 'lib/optimization/engine/container/computedStatsContainer' // x 的类型，提供 x.buff() 等方法
import { type LightConeConditionalsController } from 'types/conditionals' // 光锥 conditionals 函数的返回类型接口
import {
  type LightConeId,           // 光锥 ID 的品牌类型（字符串，但有类型约束）
  type SuperImpositionLevel,  // 叠影层数类型（0~4，对应叠影 1~5）
} from 'types/lightCone'
import { type LightConeConfig } from 'types/lightConeConfig' // 光锥导出对象的类型（id + conditionals）
import {
  type OptimizerAction,  // 当前计算的角色状态快照（条件值、光锥条件等）
  type OptimizerContext, // 战斗环境（敌人数量、队友信息、能量上限等）
} from 'types/optimizer'

// beta 光锥尚未收录进 game_data.json，'23062' 不在合法 LightConeId 列表里，直接 as LightConeId 会报错
// 通过 as unknown as LightConeId 两步强转绕过类型检查：任何类型→unknown→任何类型
const I_AM_AS_YOU_BEHOLD_ID = '23062' as unknown as LightConeId

const conditionals = (s: SuperImpositionLevel, _withContent: boolean): LightConeConditionalsController => {
  const betaContent = i18next.t('BetaMessage', { ns: 'conditionals', Version: CURRENT_DATA_VERSION })
  const { SOURCE_LC } = Source.lightCone(I_AM_AS_YOU_BEHOLD_ID)

  const sValuesErr = [0.10, 0.125, 0.15, 0.175, 0.20]
  const sValuesUltDmgPerEnergy = [0.10, 0.125, 0.15, 0.175, 0.20]
  const sValuesUltDmgCap = [0.60, 0.75, 0.90, 1.05, 1.20]
  const sValuesTeamCd = [0.25, 0.3125, 0.375, 0.4375, 0.50]

  const defaults = {
    ultimateEnergyDmgBoost: true,
    kingsEntertainment: true,
  }

  const teammateDefaults = {
    kingsEntertainment: true,
  }

  const content: ContentDefinition<typeof defaults> = {
    ultimateEnergyDmgBoost: {
      lc: true,
      id: 'ultimateEnergyDmgBoost',
      formItem: 'switch',
      text: 'Ult Energy DMG boost',
      content: betaContent,
    },
    kingsEntertainment: {
      lc: true,
      id: 'kingsEntertainment',
      formItem: 'switch',
      text: 'King\'s Entertainment',
      content: betaContent,
    },
  }

  const teammateContent: ContentDefinition<typeof teammateDefaults> = {
    kingsEntertainment: content.kingsEntertainment,
  }

  return {
    content: () => Object.values(content),
    teammateContent: () => Object.values(teammateContent),
    defaults: () => defaults,
    teammateDefaults: () => teammateDefaults,
    precomputeEffectsContainer: (x: ComputedStatsContainer, action: OptimizerAction, context: OptimizerContext) => {
      const r = action.lightConeConditionals as Conditionals<typeof content>
      const ultDmgBoost = Math.min(sValuesUltDmgCap[s], context.baseEnergy * sValuesUltDmgPerEnergy[s] / 100)

      x.buff(StatKey.ERR, sValuesErr[s], x.source(SOURCE_LC))
      x.buff(StatKey.BOOST, r.ultimateEnergyDmgBoost ? ultDmgBoost : 0, x.damageType(DamageTag.ULT).source(SOURCE_LC))
    },
    precomputeMutualEffectsContainer: (x: ComputedStatsContainer, action: OptimizerAction, context: OptimizerContext) => {
      const m = action.lightConeConditionals as Conditionals<typeof teammateContent>

      x.buff(StatKey.CD, m.kingsEntertainment ? sValuesTeamCd[s] : 0, x.targets(TargetTag.FullTeam).source(SOURCE_LC))
    },
  }
}

export const IAmAsYouBehold: LightConeConfig = {
  id: I_AM_AS_YOU_BEHOLD_ID,
  conditionals,
}
