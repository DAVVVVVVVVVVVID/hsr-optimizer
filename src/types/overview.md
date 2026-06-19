# src/types 说明

TypeScript 类型定义目录。按职责分为以下几组。

---

## 一、核心游戏实体

### `character.ts`

| 类型 | 说明 |
|---|---|
| `CharacterId` | 角色 id 字面量联合类型，直接从 game_data.json 的 key 推导，保证类型安全 |
| `Eidolon` | 星魂层数（number 别名） |
| `Character` | 存档中一条角色记录：id、当前装备构建、优化器 form 配置、已保存构建列表、自定义头像 |

### `relic.ts`

| 类型 | 说明 |
|---|---|
| `Relic` | 一件完整遗器，包含部位、套装、主/副词条、augmentedStats、强化等级、装备者等 |
| `UnaugmentedRelic` | 导入阶段的"半成品"遗器，augmentedStats 尚未注入 |
| `RelicSubstatMetadata` | 单条副词条：属性名、数值、rolls（高/中/低档次分布）、addedRolls |
| `StatRolls` | 副词条各档次强化次数：`{ high, mid, low }` |
| `RelicId` / `RelicGrade` / `RelicEnhance` | 遗器 id、星级、强化等级的类型别名 |

### `lightCone.ts`

| 类型 | 说明 |
|---|---|
| `LightConeId` | 光锥 id 字面量联合类型，从 game_data.json 推导 |
| `SuperImpositionLevel` | 叠影层数（number 别名） |
| `LightCone` | 光锥完整信息：id、名称、命途、稀有度、叠影效果、图片偏移 |

---

## 二、配置类型（角色 / 光锥 / 套装的功能定义）

### `characterConfig.ts`

每个角色的"配置对象"，由 `src/lib/conditionals/` 中各角色文件实现。

| 类型 | 说明 |
|---|---|
| `CharacterConfig` | 角色配置：默认光锥、展示参数、条件效果控制器函数、评分元数据 |
| `CharacterDisplay` | 角色展示参数：角色图片/Spine/背景的中心坐标偏移、展示色 |
| `CharacterConditionalFunction` | 函数签名：接受星魂层数和是否带 UI 内容，返回 `CharacterConditionalsController` |

### `lightConeConfig.ts`

| 类型 | 说明 |
|---|---|
| `LightConeConfig` | 光锥配置：id、条件效果控制器函数、展示参数 |
| `LightConeConditionalFunction` | 函数签名：接受叠影层数、是否带内容、装备者信息，返回控制器 |
| `LightConeDisplay` | 光锥图片偏移参数 |

### `setConfig.ts`

遗器套装的功能定义。

| 类型 | 说明 |
|---|---|
| `SetConfig` | 套装配置：id、SetInfo、条件效果、展示参数 |
| `SetInfo` | 套装基本信息：内部索引、类型（内圈/外圈）、游戏内 id、2 件套属性标签 |
| `SetConditionals` | 套装的计算钩子：`p2c/p4c`（基础属性阶段）、`p2x/p4x`（计算属性阶段）、`p2t/p4t`（队友阶段）、GPU shader 等 |
| `SetDisplay` | 套装在优化器 UI 中的展示：条件类型、i18n key、是否可调、下拉选项、默认值 |
| `TeammateOption` | 套装的"队友选项"：当其他角色装备该套装时，可以对主角施加的 buff 选项 |
| `SelectOptionContent` | 下拉选项的展示内容：`{ display, value, label }` |

---

## 三、优化器表单

### `form.ts`

优化器表单的完整状态类型，也是每个角色的 `form` 字段的类型。

| 类型 | 说明 |
|---|---|
| `Form` | 优化器表单全部字段（见下方展开） |
| `Teammate` | 单个队友的配置：角色、光锥、星魂、条件值、套装 |
| `StatFilters` | 面板数值 min/max 筛选：ATK/HP/DEF/SPD/CR/CD/EHR/RES/BE/ERR，共 12 对 |
| `RatingFilters` | 伤害输出 min/max 筛选：普攻/战技/终结技/追加/持续/超击破/有效血量/忆灵，共 9 对 |
| `RelicSetFilters` | 内圈套装筛选格式：`[件数]` 或 `[件数, 套装名]` 或 `[件数, 套装1, 套装2]` 的数组 |
| `OrnamentSetFilters` | 外圈套装筛选：套装名数组 |
| `TeammateProperty` | `'teammate0' | 'teammate1' | 'teammate2'` |

`Form` 主要包含：
- 角色/光锥基础（id、等级、星魂、叠影）
- 敌人参数（等级、韧性、抗性、是否弱点）
- 条件值（角色/光锥/套装条件开关）
- 遗器筛选（主词条要求、套装要求、品质要求）
- 外部 buff（队友加成，合并进 `combatBuffs`）
- 副词条评分权重
- 组合轮次设置（comboType、comboTurnAbilities）
- 3 个队友

---

## 四、优化器运行时

### `optimizer.ts`

优化器在计算过程中使用的运行时类型。

| 类型 | 说明 |
|---|---|
| `OptimizerContext` | 一次优化任务的完整上下文，包含：角色元数据、敌人参数、基础属性、所有 action 列表、控制器、GPU shader 变量等。贯穿整个计算流程 |
| `OptimizerAction` | 一次"行动"（如一次普攻/战技）的计算单元，包含：预计算属性容器、条件值、队友信息、命中列表、行动类型等 |
| `TeammateAction` | 队友行动的精简版：角色 id、星魂、条件值 |
| `SetConditional` | 套装条件的运行时状态：`{ enabledXxx: boolean, valueXxx: number }` |
| `CharacterMetadata` | 角色元数据快照：id、星魂、光锥、命途、属性 |
| `CharacterStatsBreakdown` | 属性来源拆分：基础值 / 光锥 / 行迹三部分 |
| `BasicForm` | Form 的最小子集，仅含角色 id、星魂、光锥 id、叠影 |
| `ShaderVariables` | GPU shader 变量：action 数量、是否需要有效生命值计算 |

---

## 五、条件效果系统

### `conditionals.ts`

角色和光锥的条件效果（被动、主动技能特效）的接口定义。

| 类型 | 说明 |
|---|---|
| `ConditionalsController` | 所有控制器的基础接口，包含：UI 内容生成（`content()`）、默认值、预计算钩子、GPU shader 生成函数、动态条件等 |
| `CharacterConditionalsController` | 角色专用接口，比基础接口多了必填字段：`entityDeclaration`、`actionDefinition`、`precomputeEffectsContainer`、`finalizeCalculations` |
| `LightConeConditionalsController` | 光锥专用接口（目前与基础接口相同） |
| `ConditionalValueMap` | 条件值的存储格式：`Record<string, number \| boolean>` |
| `ContentItem` | 优化器条件 UI 中一个控件的描述，是 switch/slider/select 三种控件的联合类型 |
| `ContentComponentMap` | 三种控件类型与其 React 组件的映射 |

**控制器钩子执行顺序：**
```
initializeConfigurationsContainer    // 配置初始化（属性类型切换、弱点覆盖等）
  ↓
precomputeEffectsContainer           // 自身 buff
precomputeMutualEffectsContainer     // 自身 + 队友共享 buff（AOE）
precomputeTeammateEffectsContainer   // 作为队友时对主角的 buff
  ↓
dynamicConditionals                  // 依赖其他属性的动态条件（随属性变化实时触发）
  ↓
finalizeCalculations                 // 最终伤害乘数计算（此阶段不再修改属性）
```

### `hitConditionalTypes.ts`

伤害计算中"一次命中"的类型定义。

| 类型 | 说明 |
|---|---|
| `AbilityDefinition` | 一个技能的定义，包含该技能的所有命中列表 |
| `HitDefinition` | 所有命中类型的联合类型（见下） |
| `CritHitDefinition` | 普通暴击伤害命中（大多数技能使用） |
| `DotHitDefinition` | 持续伤害命中（灼烧/触电等），含触发概率、层数 |
| `BreakHitDefinition` | 击破伤害命中 |
| `SuperBreakHitDefinition` | 超击破命中 |
| `AdditionalHitDefinition` | 追加攻击命中，可覆盖暴击率/暴击伤害 |
| `HealHitDefinition` | 治疗命中 |
| `ShieldHitDefinition` | 护盾命中 |
| `HealTallyHitDefinition` | 基于已计算治疗量换算伤害的命中 |
| `ElationHitDefinition` | 欢愉（Elation）特殊伤害类型 |
| `BuffHitDefinition` | buff 命中：将一个属性的值线性/离散转化为另一属性的加成 |
| `EntityDefinition` | 实体（主角/忆灵/宠物等）的定义，包含基础属性缩放、目标遮罩等 |
| `Hit` | 命中定义 + 运行时字段的完整类型（带 `HitRuntime`） |

---

## 六、元数据

### `metadata.ts`

游戏数据经过处理后的结构化元数据类型。

| 类型 | 说明 |
|---|---|
| `DBMetadata` | 整个游戏元数据：`characters`、`lightCones`、`relics` 三个字典 |
| `DBMetadataCharacter` | 单个角色的完整元数据，除游戏属性外还含评分元数据 |
| `DBMetadataLightCone` | 单个光锥的完整元数据 |
| `DBMetadataRelics` | 遗器数值规则表：主词条/副词条数值范围、套装列表 |
| `ScoringMetadata` | 角色评分配置：推荐主词条、副词条权重、预设、排序选项、模拟参数 |
| `ScoringMetadataOverride` | 用户自定义覆盖评分配置的 partial 类型 |
| `SimulationMetadata` | 伤害模拟的参数：推荐套装、副词条池、队友配置、技能轮次、断点等 |
| `ScoringConfigType` | 评分类型枚举：DPS / BUFFER / HEAL / SHIELD |
| `TraceNode` | 行迹树节点（含前置关系和子节点） |
| `ElementalDamageType` | 属性伤害加成类型字面量联合 |
| `ElementalResPenType` | 属性抗性穿透类型字面量联合 |

---

## 七、存档与构建

### `savedBuild.ts`

角色的已保存构建。

| 类型 | 说明 |
|---|---|
| `Build` | 6 个部位到遗器 UUID 的映射（`Partial<Record<Parts, RelicId>>`） |
| `SavedBuild` | 已保存构建的联合类型 = `CharacterSavedBuild \| OptimizerSavedBuild` |
| `CharacterSavedBuild` | 从"角色"页保存的构建，含队友但不含完整条件值 |
| `OptimizerSavedBuild` | 从"优化器"页保存的构建，含完整条件值、combo 配置 |
| `SavedTeammate` | 保存的队友信息（无条件值） |
| `SavedTeammateWithConditionals` | 保存的队友信息（含条件值） |
| `BuildSource` | 构建来源枚举：`Character \| Optimizer` |
| `TeamTuple<T>` | 三元组 `[T\|null, T\|null, T\|null]`，代表3个队友位 |

### `store.ts`

应用状态和持久化存档的类型。

| 类型 | 说明 |
|---|---|
| `HsrOptimizerSaveFormat` | 完整的存档文件格式（写入 localStorage 或导出文件） |
| `HsrOptimizerStore` | Zustand 全局 store 的类型，包含状态字段和 setter 方法 |
| `GlobalSavedSession` | 跨会话保存的 UI 状态：当前角色、评分类型、计算引擎、展示设置、侧栏状态等 |
| `UserSettings` | 用户偏好设置：装备行为、侧栏行为、面板位置等 |
| `StatDisplay` | 面板显示模式：`'combat'`（战斗面板）\| `'base'`（基础面板） |
| `MemoDisplay` | 忆灵显示模式：`'memo'`（忆灵）\| `'summoner'`（召唤者） |

---

## 八、UI / 展示

### `customImage.ts`

用户上传自定义角色立绘的相关类型。

| 类型 | 说明 |
|---|---|
| `CustomImageConfig` | 完整的自定义图片配置：URL、原始尺寸、裁剪参数、缩放/位置、作者名 |
| `CroppedArea` | 裁剪区域：左上角偏移 + 宽高 |
| `CustomImageParams` | 裁剪操作返回的参数（相对 + 像素两种坐标） |
| `ImageDimensions` | 图片原始宽高 |
| `CustomImagePayload` | 自定义图片的操作事件：`add \| delete` |

### `components.ts`

React 组件通用 prop 类型。

| 类型 | 说明 |
|---|---|
| `ReactElement` | `React.JSX.Element` 的别名 |
| `IconExtractedProps` | 图标组件的公共 props：className、style、onClick、color |

---

## 九、工具类型

### `common.ts`

通用工具类型。

| 类型 | 说明 |
|---|---|
| `NumberToNumberMap` | `Record<number, number>` 别名 |
| `StringToNumberMap` | `Record<string, number>` 别名 |
| `Nullable<T>` | `T \| null \| undefined`，表示可能为空的值 |
| `Prettify<T>` | 展开交叉类型，让编辑器 hover 时显示展开后的字段而不是 `A & B` |

---

## 十、声明文件（环境扩展）

这些文件不定义业务类型，而是扩展全局环境的类型系统。

### `window.ts`

扩展 `Window` 接口，声明项目挂载在 `window` 上的全局变量：
- `jipt` — Crowdin 译员模式工具
- `showSaveFilePicker` — 浏览器文件保存 API
- `__HSR_DEBUG` — 开发调试工具集合（在 `index.tsx` 中注入）
- `WEBGPU_DEBUG` / `CARD_DEBUG` 等调试开关

### `vite-env.ts`

扩展 Vite 的 `ImportMeta`，使 `import.meta.env` 拥有正确类型。

### `mathml.d.ts`

扩展 React 的 JSX 类型系统，补充 `<math>`、`<mfrac>`、`<mi>` 等 MathML 元素，使其可以在 TSX 中直接使用。

### `i18next.ts`

扩展 i18next 的 `CustomTypeOptions`，将 `resources.d.ts` 的资源类型注入，使 `t()` 函数获得完整的类型提示和 key 校验。

### `resources.d.ts`

由 `npm run update-resources` **自动生成**，包含所有翻译 namespace 的 key 类型映射。**不要手动修改。**
