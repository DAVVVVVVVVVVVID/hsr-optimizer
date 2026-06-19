# archive_output → sample-save 转换流程

这份文档说明游戏导出数据（`archive_output-*.json`）是如何被转换成优化器存档格式（`sample-save.json`）的。

核心入口：`src/lib/importer/kelzFormatParser.tsx` → `KelzFormatParser.parse()`

---

## 总体流程

```
archive_output.json
       │
       ▼
KelzFormatParser.parse()
  ├─ 遗器：每条 → readRelic() → RelicAugmenter.augment() → Relic
  └─ 角色：每条 → readCharacter() → 部分 Form（其余字段填默认值）
       │
       ▼
persistenceService.mergeRelics()  ← 合并进现有存档
       │
       ▼
sample-save 格式（relics[] + characters[]）
```

---

## 遗器转换

### 第一步：`readRelic()` — 结构映射

| archive_output 字段 | 转换逻辑 | sample-save 字段 |
|---|---|---|
| `slot` "Planar Sphere" | 去掉空格 | `part` "PlanarSphere" |
| `set_id` "304" | 查 game_data.json relics 得套装名 | `set` "Belobog of the Architects" |
| `rarity` | 夹紧到 2~5 | `grade` |
| `level` | 夹紧到 0~15 | `enhance` |
| `_uid` | 直接复用 | `id` |
| `location` "1212" | 查 game_data.json 验证存在 | `equippedBy` "1212" |

### 第二步：`readRelicStats()` — 数值计算

**主词条：**
- `mainstat` 字符串（如 `"Imaginary DMG Boost"`）→ 通过 `mainStatLookup` 映射为内部常量
- 用 `{grade}{partId}` 作为 key 查 `relic_main_affixes.json`，拿到 `base` 和 `step`
- 主词条最终值 = `base + step × enhance`
- 百分比类词条 × 100 存储（如 0.027648 × 100 = 2.7648%）

**副词条：**
- `key` 字符串（如 `"CRIT Rate_"`）→ 通过 `substatLookup` 映射为内部常量
- 如果存在 `count`/`step`：调用 `rollCounter()` 计算出 `rolls: { high, mid, low }`，表示这个副词条各档位分别强化了几次

```
count=1, step=1 → rolls = { high:0, mid:1, low:0 }
count=2, step=3 → rolls = { high:1, mid:1, low:0 }
```

### 第三步：`RelicAugmenter.augment()` — 注入 augmentedStats

- 把主词条 + 副词条展开成所有属性的完整映射，未出现的属性值为 0
- 百分比类属性 ÷ 100 转为小数（供优化器计算直接使用）
- 如果 `id` 为空，生成一个新 UUID
- 调用 `RelicRollGrader` 计算副词条等级

---

## 角色转换

`readCharacter()` 只提取最基础的几个字段：

```
archive characterId  →  form.characterId
archive level        →  form.characterLevel
archive eidolon      →  form.characterEidolon
light_cones[location === characterId]  →  form.lightCone / lightConeLevel / lightConeSuperimposition
```

`form` 里大量的其他字段（套装条件、角色条件、筛选范围、权重等）在导入后由 `getDefaultForm()` 填充默认值，不来自 archive 文件。

---

## 角色 id 的特殊处理：buffedCharacters

部分角色在 game_data.json 中同时存在两个 id（如 `1212` 和 `1212b1`）。导入时根据 archive 里的 `ability_version` 字段判断：

- `ability_version` 未定义或 > 0 → 使用 `b1` 版本（新版技能）
- `ability_version == 0` → 使用原始 id（旧版技能）

这个映射由 `getActivatedBuffs()` 预先生成，在遗器和角色转换完成后统一替换所有 `equippedBy` 和 `characterId` 引用。

---

## 字段命名差异速查

| archive_output | sample-save |
|---|---|
| `slot` | `part` |
| `set_id` | `set`（套装名） |
| `rarity` | `grade` |
| `level` | `enhance` |
| `_uid` | `id` |
| `location` | `equippedBy` |
| `mainstat` | `main.stat` |
| `substats[].key` | `substats[].stat` |
| `substats[].count` / `step` | `substats[].rolls` {high/mid/low} |
| （不存在） | `augmentedStats`（运行时注入） |
