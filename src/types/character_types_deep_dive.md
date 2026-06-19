# Character 相关类型深度解析

围绕"角色"这个概念，项目有大约 10 个相关类型，分属**三个不同的层次**：游戏数据层、用户存档层、运行时计算层。

---

## 一、全貌：三层结构

```
┌─────────────────────────────────────────────────────────┐
│  游戏数据层（静态，启动时构建一次）                           │
│  DBMetadataCharacter    CharacterConfig                 │
│        ↕ 启动时合并                                        │
│  getGameMetadata().characters[id]  ←── 唯一权威数据源      │
└─────────────────────────────────────────────────────────┘
              ↓ 用户配置                    ↓ 优化器查询
┌─────────────────────────┐   ┌────────────────────────────┐
│  用户存档层               │   │  运行时计算层               │
│  Character               │   │  CharacterMetadata         │
│  ├─ Form                 │   │  CharacterConditionalsController│
│  ├─ Build                │   │  CharacterStatsBreakdown   │
│  └─ SavedBuild[]         │   └────────────────────────────┘
└─────────────────────────┘
```

---

## 二、游戏数据层

### `CharacterId`
```ts
// 直接从 game_data.json 的 key 推导，不是手写的字符串
type CharacterId = keyof typeof data.characters
// 实际值例如：'1001' | '1212' | '1212b1' | ...
```
用途：所有涉及角色的地方都用这个类型而不是裸的 `string`，TypeScript 会在编译期检查 id 是否存在于游戏数据中。

---

### `DBMetadataCharacter`（`metadata.ts`）

**是什么：** 从 `game_data.json` 读取并经过 `metadataInitializer.ts` 处理后的角色数据，是整个应用读取角色游戏属性的唯一来源。

**结构：**
```ts
type DBMetadataCharacter = {
  id: CharacterId,
  rarity: number,           // 星级
  path: PathName,           // 命途
  element: ElementName,     // 属性
  max_sp: number,           // 最大能量
  stats: Record<string, number>,   // 角色面板基础属性（攻/防/血/速等）
  unreleased: boolean,

  // 行迹
  traces: Record<string, number>,  // 满解锁后总加成
  traceTree: TraceNode[],          // 行迹树节点结构（含前置关系）

  // 展示（来自 CharacterConfig.display）
  imageCenter: ImageCenter,
  spineCenter: ImageCenter,
  backgroundCenterOffset: { x, y, z },
  disableSpine: boolean,

  // 评分配置（来自 CharacterConfig.scoring）
  scoringMetadata: ScoringMetadata,
}
```

**重要**：`imageCenter`、`spineCenter`、`scoringMetadata` 这几个字段**不来自游戏数据**，是启动时从 `CharacterConfig` 合并进来的（见下方）。

---

### `CharacterConfig`（`characterConfig.ts`）

**是什么：** 开发者为每个角色手写的功能定义文件，位于 `src/lib/conditionals/character/` 下，每个角色一个 `.ts` 文件。

**结构：**
```ts
type CharacterConfig = {
  id: CharacterId,
  defaultLightCone: LightConeId,      // 角色推荐/默认光锥
  display: CharacterDisplay,           // 图片/Spine 展示参数
  conditionals: CharacterConditionalFunction,  // 条件效果工厂函数（见下）
  scoring: ScoringMetadata,            // 角色的评分配置和推荐主词条
}
```

实际例子（Blade）：
```ts
export const Blade: CharacterConfig = {
  id: '1212b1',
  defaultLightCone: '23010',
  display: { imageCenter: { x: 0, y: 0.1, z: 1 } },
  conditionals: (e, withContent) => { ... },  // 返回控制器
  scoring: { ... },
}
```

**`CharacterDisplay`** 的结构：
```ts
type CharacterDisplay = {
  imageCenter?: { x, y, z },           // 角色图片的展示中心点
  spineCenter?: { x, y, z },           // Spine 动画中心点
  backgroundCenterOffset?: { x, y, z },
  disableSpine?: boolean,              // 是否禁用 Spine 动画
  showcaseColor?: string,              // 展示卡片的主题色
  gridPortraitOffset?: number,         // 角色列表头像偏移
}
```

---

### 两者的关系：启动时合并

```
game_data.json → DBMetadataCharacter（基础游戏数据）
                         +
CharacterConfig（开发者写的功能定义）
                         ↓
          metadataInitializer.applyCharacterConfig()
                         ↓
      getGameMetadata().characters[id]（最终完整数据）
```

`metadataInitializer.ts` 在应用启动时遍历所有角色，把 `CharacterConfig.display` 和 `CharacterConfig.scoring` 合并进 `DBMetadataCharacter`。之后代码只需查 `getGameMetadata().characters[id]` 就能拿到一切。

---

## 三、用户存档层

### `Character`（`character.ts`）

**是什么：** 存档文件里一条角色记录，代表"这个用户拥有并配置过的角色"。

```ts
type Character = {
  id: CharacterId,           // 角色 id（含构建后缀，如 '1212b1'）
  equipped: Build,           // 当前装备的 6 件遗器
  form: Form,                // 优化器表单的完整配置
  builds?: SavedBuild[],     // 保存的多套构建快照
  portrait?: CustomImageConfig,  // 用户上传的自定义立绘
}
```

---

### `Build`（`savedBuild.ts`）

```ts
type Build = Partial<Record<Parts, RelicId>>
// 实际形如：
// { Head: 'uuid-1', Hands: 'uuid-2', Body: 'uuid-3', ... }
```

注意是 `Partial`，某个部位没装备时该 key 不存在。存的是遗器的 UUID（对应 `relics[].id`），不是遗器完整数据。

---

### `SavedBuild`（`savedBuild.ts`）

**是什么：** 用户手动保存的一套完整构建快照，区别于 `Character.equipped`（当前穿的），这是"书签"功能。

```ts
// 联合类型，来源决定包含的字段
type SavedBuild = CharacterSavedBuild | OptimizerSavedBuild

// 从"角色"页保存——只存队友信息，不存详细条件值
type CharacterSavedBuild = {
  name: string,
  source: BuildSource.Character,
  characterId, equipped, characterEidolon, lightCone, lightConeSuperimposition,
  team: [SavedTeammate | null, SavedTeammate | null, SavedTeammate | null],
}

// 从"优化器"页保存——存完整条件值、combo配置
type OptimizerSavedBuild = {
  source: BuildSource.Optimizer,
  // ...以上所有字段，加上：
  characterConditionals: ConditionalValueMap,
  lightConeConditionals: ConditionalValueMap,
  setConditionals: SetConditionals,
  comboType, comboStateJson, comboTurnAbilities, deprioritizeBuffs,
}
```

---

### `Form`（`form.ts`）

**是什么：** 优化器表单的完整状态，同时也是 `Character.form` 的类型，代表这个角色的所有优化设置。内容已在 `types/overview.md` 中展开，这里只说它在 `Character` 中的角色：

`form` 是"用户为这个角色配置的优化意图"，包含角色/光锥等级、套装要求、筛选条件、队友、条件开关等全部内容。每次打开优化器时就是在编辑这个 form。

---

## 四、运行时计算层

### `CharacterConditionalsController`（`conditionals.ts`）

**是什么：** `CharacterConfig.conditionals(eidolon, withContent)` 执行后返回的**实例**，包含该角色在当前星魂下的所有条件效果钩子。

```ts
// 调用方式：
const controller = CharacterConditionalsResolver.get({
  characterId: '1212b1',
  characterEidolon: 2,
}, withContent = true)

// controller 上有：
controller.content()                    // 返回 UI 控件描述列表
controller.precomputeEffectsContainer() // 计算自身 buff
controller.finalizeCalculations()       // 计算最终伤害乘数
// ...
```

`withContent = true` 时会生成完整的 UI 控件描述（用于展示），`false` 时跳过，仅保留计算逻辑（优化器高性能路径）。

---

### `CharacterMetadata`（`optimizer.ts`）

**是什么：** 优化器 `OptimizerContext` 中记录的角色基础信息快照，是从 `Form` + 游戏数据中提取的轻量版本。

```ts
type CharacterMetadata = {
  characterId: CharacterId,
  characterEidolon: number,
  lightCone: string,
  lightConeSuperimposition: number,
  lightConePath: PathName,   // 光锥命途（用于判断是否适用）
  path: PathName,            // 角色命途
  element: ElementName,      // 角色属性（用于属性伤害计算）
}
```

和 `Character` 的区别：`Character` 是完整存档对象（含 form、equipped、builds），`CharacterMetadata` 只是优化一次计算所需的最小元信息。

---

### `CharacterStatsBreakdown`（`optimizer.ts`）

**是什么：** 角色基础属性按来源拆分的结构，用于展示面板中"属性来源明细"。

```ts
type CharacterStatsBreakdown = {
  base: Record<string, number>,       // 角色自身基础属性
  lightCone: Record<string, number>,  // 光锥提供的属性
  traces: Record<string, number>,     // 行迹提供的属性
}
```

---

## 五、类型关系总结

```
CharacterId ──────────────────── 贯穿所有类型的 key

game_data.json
    │
    ▼
DBMetadataCharacter ←── merge ── CharacterConfig
    │                              │
    │ getGameMetadata()             ├─ display → CharacterDisplay
    │                              ├─ scoring → ScoringMetadata
    │                              └─ conditionals → CharacterConditionalFunction
    │                                                      │
    │                                                      ▼（调用后得到）
    │                                      CharacterConditionalsController
    │
    └── 提供游戏属性 ──→ 优化器构建 CharacterMetadata / CharacterStatsBreakdown


存档文件
    │
    ▼
Character
    ├─ equipped: Build
    │       └─ Partial<Record<Parts, RelicId>>  →  Relic（通过 UUID 关联）
    ├─ form: Form
    │       └─ 包含 characterConditionals / setConditionals 等条件值
    └─ builds: SavedBuild[]
            ├─ CharacterSavedBuild（来自角色页）
            └─ OptimizerSavedBuild（来自优化器页）
```

**一句话总结各类型职责：**

| 类型 | 职责 |
|---|---|
| `CharacterId` | 类型安全的角色 id |
| `DBMetadataCharacter` | 游戏数据（统一数据源） |
| `CharacterConfig` | 开发者写的角色功能定义 |
| `CharacterDisplay` | 角色展示参数 |
| `Character` | 存档中的用户角色记录 |
| `Build` | 当前装备的6件遗器 |
| `SavedBuild` | 保存的构建快照（书签） |
| `Form` | 优化器表单/优化意图 |
| `CharacterConditionalsController` | 运行时条件效果实例 |
| `CharacterMetadata` | 优化计算的角色元信息快照 |
| `CharacterStatsBreakdown` | 属性来源拆分（展示用） |
