# Conditionals 系统深度解析

---

## 是什么

每个角色和光锥都有独特的技能效果。优化器需要精确计算这些效果才能给出正确的伤害数值，但"镜流在强化状态下暴击率+50%"、"刃的终结技以血量上限为基础缩放"这类逻辑没有通用公式——每个角色都不一样。

**Conditionals 系统就是解决这个问题的机制：** 把每个角色的独特逻辑封装成一个实现固定接口的控制器对象，优化器计算引擎统一调用接口，不需要关心里面写的是什么。

源文件位于 `src/lib/conditionals/character/` 和 `src/lib/conditionals/lightcone/`，每个角色/光锥一个 `.ts` 文件。

---

## 核心接口：`ConditionalsController`

```ts
interface ConditionalsController {
  // ——— UI 部分 ———
  content: () => ContentItem[]           // 返回在优化器界面显示的条件控件列表
  defaults: () => ConditionalValueMap    // 各条件的默认值

  // ——— 技能定义 ———
  entityDeclaration: () => string[]      // 声明参与计算的实体名（主角、忆灵等）
  entityDefinition: (...)                // 定义每个实体的基础属性（primary/summon/memosprite）
  actionDeclaration: () => AbilityKind[] // 声明参与计算的技能类型（普攻/战技/终结技等）
  actionDefinition: (...)                // 定义每个技能的命中列表（伤害倍率、属性、韧性伤害等）

  // ——— 计算钩子 ———
  precomputeEffectsContainer: (x, action, context) => void  // 预计算自身 buff
  precomputeMutualEffectsContainer?: (x, action, context)   // 预计算自身+队友共享 buff（AOE）
  precomputeTeammateEffectsContainer?: (x, action, context) // 作为队友时给主角施加的 buff
  dynamicConditionals?: DynamicConditional[]                 // 依赖其他属性的动态条件
  finalizeCalculations: (x, action, context) => void        // 最终乘数计算（属性计算完成后）

  // ——— GPU 版本 ———
  newGpuFinalizeCalculations?: (...)                         // 上述钩子的 WGSL shader 实现
}
```

`CharacterConditionalsController` 是更严格的子接口，把 `entityDeclaration`、`actionDefinition`、`precomputeEffectsContainer`、`finalizeCalculations` 变成**必填**（角色比光锥需要更完整的实现）。

---

## 计算钩子的执行顺序

```
1. initializeConfigurationsContainer     // 配置初始化（弱点类型覆盖、伤害类型切换等）
        ↓
2. precomputeEffectsContainer            // 自身被动 buff（只影响自己）
   precomputeMutualEffectsContainer      // AOE buff（影响自己和队友）
   precomputeTeammateEffectsContainer    // 作为队友时对主角的 buff
        ↓
3. dynamicConditionals                   // 实时触发的动态条件（如"CR > 70% 时加 CD"）
        ↓
4. finalizeCalculations                  // 最终乘数（此阶段不能再修改属性，只做最终计算）
```

---

## 用户交互：条件值如何流动

```
用户在优化器 UI 拨动开关/滑块
        ↓
Form.characterConditionals 更新（存储在角色存档中）
        ↓
优化器启动计算时，读取 action.characterConditionals
        ↓
传入 precomputeEffectsContainer(x, action, context)
        ↓
代码里 const r = action.characterConditionals  →  r.talentEnhancedState / r.moonlightStacks 等
        ↓
根据 r 的值决定是否调用 x.buff(...)
```

`content()` 描述**显示什么控件**，`defaults()` 提供**初始值**，实际存储和读取都通过 `ConditionalValueMap`（一个 `Record<string, number | boolean>`）完成。

---

## 具体例子：镜流（JingliuB1）

文件：`src/lib/conditionals/character/1200/JingliuB1.ts`

### 第一步：定义技能倍率

```ts
const talentCrBuff    = talent(e, 0.50, 0.52)   // 天赋：e3 前 50%，e3 后 52%
const skillScaling    = skill(e, 1.50, 1.65)    // 战技：e5 前 1.50，e5 后 1.65
const talentCdScaling = talent(e, 0.44, 0.484)  // 月光层 CD 加成
```

`AbilityEidolon.ULT_TALENT_3_SKILL_BASIC_5` 是一个工具，自动处理"终结技天赋3级提升、战技普攻5级提升"的星魂阶段切换。

### 第二步：声明条件和默认值

```ts
const defaults = {
  talentEnhancedState: true,   // 是否处于强化状态（天赋）
  maxSyzygyDefPen: true,       // 是否达到最大因果（减防）
  moonlightStacks: 5,          // 月光层数（0~5）
  e1Buffs: true,               // 星魂1：CD 加成
  e2SkillDmgBuff: true,        // 星魂2：战技伤害提升
  e4MoonlightCdBuff: true,     // 星魂4：月光层额外 CD
  e6ResPen: true,              // 星魂6：冰属性抗性穿透
}
```

### 第三步：定义 UI 控件

```ts
const content = {
  talentEnhancedState: {
    formItem: 'switch',           // 开关类型
    text: t('talentEnhancedState.text'),
    content: t('talentEnhancedState.content', { UltCRBuff: 50 }),
  },
  moonlightStacks: {
    formItem: 'slider',           // 滑块类型
    min: 0,
    max: 5,
    text: t('moonlightStacks.text'),
    content: t('moonlightStacks.content', { MoonlightCDBuff: 44 }),
  },
  e2SkillDmgBuff: {
    formItem: 'switch',
    disabled: e < 2,              // 不满足星魂时禁用
    ...
  },
  // ...其他条件
}
```

优化器界面渲染时会读取 `content()` 返回的列表，根据 `formItem` 类型决定显示开关还是滑块，并自动处理 `disabled`。

### 第四步：定义技能命中

```ts
actionDefinition: (action, context) => {
  const r = action.characterConditionals as Conditionals<typeof content>
  const e1SkillBonus = (e >= 1 && r.e1Buffs && r.talentEnhancedState) ? 0.80 : 0

  return {
    [AbilityKind.SKILL]: {
      hits: [
        HitDefinitionBuilder.standardSkill()
          .damageElement(ElementTag.Ice)
          .hpScaling(skillScaling + e1SkillBonus)  // 以血量为缩放基础
          .toughnessDmg(20)
          .build(),
      ],
    },
    // BASIC, ULT, BREAK 同理
  }
}
```

这里就体现了"镜流以血量缩放"和"e1 额外加成"的具体实现。

### 第五步：预计算 buff

```ts
precomputeEffectsContainer: (x, action, context) => {
  const r = action.characterConditionals as Conditionals<typeof content>

  // 天赋：强化状态下 CR +50%
  x.buff(StatKey.CR, r.talentEnhancedState ? talentCrBuff : 0, x.source(SOURCE_TALENT))

  // 天赋：每层月光 +44% CD
  x.buff(StatKey.CD, r.moonlightStacks * talentCdScaling, x.source(SOURCE_TALENT))

  // 行迹：满因果减防 25%
  x.buff(StatKey.DEF_PEN, r.maxSyzygyDefPen ? 0.25 : 0, x.source(SOURCE_TRACE))

  // 行迹：强化状态终结技伤害 +20%
  x.buff(StatKey.BOOST, r.talentEnhancedState ? 0.20 : 0,
    x.damageType(DamageTag.ULT).source(SOURCE_TRACE))

  // 星魂1：+36% CD
  x.buff(StatKey.CD, (e >= 1 && r.e1Buffs) ? 0.36 : 0, x.source(SOURCE_E1))

  // 星魂6：30% 冰属性抗性穿透
  x.buff(StatKey.RES_PEN, (e >= 6 && r.e6ResPen) ? 0.30 : 0,
    x.elements(ElementTag.Ice).source(SOURCE_E6))
}
```

每个 `x.buff()` 调用都带 `source` 标记，用于在 UI 展示"属性来源明细"时分拆显示（天赋给了多少、星魂1给了多少）。

---

## DynamicConditionals（动态条件）

普通钩子在每次计算开始时执行一次。动态条件不同：它监听某个属性，当该属性每次改变时都重新触发。

典型场景："当暴击率超过 80% 时，额外增加 30% 暴击伤害。" 因为暴击率本身是计算过程中动态变化的，只能用动态条件处理。

```ts
dynamicConditionals: [{
  id: 'SomeBuff',
  type: ConditionalActivationType.SINGLE,
  dependsOn: [Stats.CR],
  condition: (x, action, context) => x.get(StatKey.CR) >= 0.80,
  effect: (x, action, context) => {
    x.buff(StatKey.CD, 0.30, ...)
  },
}]
```

---

## 总结

| 部分 | 作用 |
|---|---|
| `content()` | 描述 UI 控件（开关/滑块/下拉），界面渲染用 |
| `defaults()` | 各条件的初始值 |
| `actionDefinition()` | 定义技能的命中倍率和伤害类型 |
| `precomputeEffectsContainer()` | 把条件值转换为属性 buff |
| `dynamicConditionals` | 依赖其他属性实时触发的条件 |
| `finalizeCalculations()` | 所有属性算完后的最终乘数 |
| `newGpuFinalizeCalculations()` | 以上逻辑的 GPU shader（WGSL）实现 |
