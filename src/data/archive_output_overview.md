# archive_output 文件结构说明

这是由 **reliquary_archiver** 工具从游戏客户端中导出的原始账号数据，用于导入到优化器中。
对应项目导入功能的入口：`src/lib/importer/`。

---

## 顶层结构

```json
{
  "source":    "reliquary_archiver",  // 导出工具名
  "build":     "0.16.0",             // 工具版本号
  "version":   4,                    // 数据格式版本（用于兼容性判断）
  "metadata":  { ... },              // 账号基础信息
  "gacha":     { ... },              // 抽卡货币
  "materials": [ ... ],              // 材料/道具库存
  "light_cones":[ ... ],             // 光锥库存
  "relics":    [ ... ],              // 遗器库存
  "characters":[ ... ]               // 已拥有角色
}
```

---

## `metadata`

```json
{
  "uid": 122005338,       // 游戏账号 UID
  "trailblazer": "Caelus" // 开拓者性别选择（Caelus=男 / Stelle=女）
}
```

---

## `gacha`

```json
{
  "stellar_jade":  15642, // 星琼数量
  "oneric_shards": 63     // 星芒数量
}
```

---

## `materials`

道具/材料库存，为数组：

```json
[
  {
    "id":    "110",
    "name":  "Fuel Vouchers",  // 道具名
    "count": 510               // 持有数量
  }
]
```

---

## `light_cones`

账号拥有的所有光锥（含未装备的），为数组：

```json
{
  "id":              "23014",      // 光锥 id（对应 game_data.json 中的 lightCones key）
  "name":            "I Shall Be My Own Sword",
  "level":           80,           // 当前等级
  "ascension":       6,            // 晋阶阶段（0~6）
  "superimposition": 1,            // 叠影层数（1~5）
  "location":        "1212",       // 当前装备的角色 id，未装备时为空字符串 ""
  "lock":            true,         // 是否在游戏内上锁
  "_uid":            "42"          // 工具内部序号，用于唯一标识（非游戏 id）
}
```

---

## `relics`

账号拥有的所有遗器，为数组，是导入功能最核心的数据：

```json
{
  "set_id":   "304",                    // 套装 id（对应 game_data.json 中 relics[].id）
  "name":     "Belobog of the Architects", // 套装名
  "slot":     "Planar Sphere",          // 部位：Head / Hands / Body / Feet / Planar Sphere / Link Rope
  "rarity":   5,                        // 星级
  "level":    3,                        // 当前强化等级（0~15）
  "mainstat": "Imaginary DMG Boost",    // 主词条属性名
  "substats": [
    {
      "key":   "HP",          // 副词条属性 key
                              // 注意：带下划线后缀 _ 表示百分比，如 HP_=生命值%、CRIT Rate_=暴击率
                              //       不带后缀表示固定值，如 HP=生命值（固定值）、SPD=速度
      "value": 38.103798,     // 实际数值（百分比类已是百分数形式，如 3.456 表示 3.456%）
      "count": 1,             // 该副词条总共强化了几次（即投入了几个词条强化次数）
      "step":  1              // 最后一次强化的档位：0=低档、1=中档、2=高档
                              // 每次强化随机一个档位，影响本次强化的具体数值
    }
  ],
  "location": "",             // 当前装备的角色 id，未装备时为空字符串 ""
  "lock":     true,           // 是否在游戏内上锁
  "discard":  false,          // 是否标记为待分解
  "_uid":     "662"           // 工具内部序号，用于唯一标识
}
```

### 副词条 key 命名规则

| key | 含义 |
|---|---|
| `HP` | 生命值（固定值） |
| `HP_` | 生命值百分比 |
| `ATK` | 攻击力（固定值） |
| `ATK_` | 攻击力百分比 |
| `DEF` | 防御力（固定值） |
| `DEF_` | 防御力百分比 |
| `SPD` | 速度 |
| `CRIT Rate_` | 暴击率 |
| `CRIT DMG_` | 暴击伤害 |
| `Effect Hit Rate_` | 效果命中 |
| `Effect RES_` | 效果抵抗 |
| `Break Effect_` | 击破特攻 |

---

## `characters`

账号拥有的所有角色：

```json
{
  "id":        "1001",          // 角色 id（对应 game_data.json 中的 characters key，不含构建后缀）
  "name":      "March 7th",
  "path":      "Preservation", // 命途
  "level":     80,
  "ascension": 6,              // 晋阶阶段（0~6）
  "eidolon":   6,              // 星魂层数（0~6）

  "skills": {
    "basic":  2,               // 普攻等级
    "skill":  6,               // 战技等级
    "ult":    3,               // 终结技等级
    "talent": 6                // 天赋等级
  },

  "traces": {
    // 大秘技节点（3 个主动能力强化）
    "ability_1": true,
    "ability_2": true,
    "ability_3": false,
    // 小词条节点（10 个属性加成节点，解锁后提供固定属性）
    "stat_1":  true,
    "stat_2":  true,
    // ...stat_3 ~ stat_10
    // 特殊行迹节点（部分角色专有）
    "special": false
  },

  "ability_version": 0         // 技能版本标记，用于技能改动后的兼容处理
}
```

> **注意**：这里角色 id 是纯数字格式（如 `1001`），导入到优化器后会经过 Novaflare 迁移转换为带构建后缀的格式（如 `1001b1`）。详见 `sample-save.json` 的 `completedMigrations` 说明。
