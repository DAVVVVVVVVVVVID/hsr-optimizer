import i18next from 'i18next'
import {
  Constants,
  type MainStats,
  type Parts,
  type Sets,
  type SubStats,
  UnreleasedSets,
} from 'lib/constants/constants'
import { Hint } from 'lib/interactions/hint'
import { Assets } from 'lib/rendering/assets'
import {
  SetsOrnaments,
  SetsRelics,
  setToId,
} from 'lib/sets/setConfigRegistry'
import { SaveState } from 'lib/state/saveState'
import { generateValueColumnOptions } from 'lib/tabs/tabRelics/columnDefs'
import {
  type FilterOption,
  FilterPill,
} from 'lib/tabs/tabRelics/topBar/FilterPill'
import { useRelicsTabStore } from 'lib/tabs/tabRelics/useRelicsTabStore'
import { MultiSelectPills } from 'lib/ui/MultiSelectPills'
import { CharacterMultiSelect } from 'lib/ui/selectors/CharacterMultiSelect'
import { TooltipImage } from 'lib/ui/TooltipImage'
import {
  isStatsValues,
  languages,
} from 'lib/utils/i18nUtils'
import {
  type ReactNode,
  useMemo,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterId } from 'types/character'
import { useShallow } from 'zustand/react/shallow'

export function FilterPillBar() {
  // 从 store 读取过滤条件、数值列配置、排除角色列表及对应的修改方法
  // useShallow：多字段取值时逐字段浅比较，避免无效重渲染
  const {
    filters,
    setFilter,
    valueColumns,
    setValueColumns,
    excludedRelicPotentialCharacters,
    setExcludedRelicPotentialCharacters,
  } = useRelicsTabStore(
    useShallow((s) => ({
      filters: s.filters,
      setFilter: s.setFilter,
      valueColumns: s.valueColumns,
      setValueColumns: s.setValueColumns,
      excludedRelicPotentialCharacters: s.excludedRelicPotentialCharacters,
      setExcludedRelicPotentialCharacters: s.setExcludedRelicPotentialCharacters,
    })),
  )

  // Pre-memoize curried setFilter results for stable references.
  // setFilter is a stable zustand action; calling setFilter('part') inline creates a new closure each render.
  // 预先缓存各过滤字段的处理函数，避免每次渲染都调用 setFilter('part') 产生新闭包导致 FilterPill 的 memo 失效
  const filterHandlers = useMemo(() => ({
    part: setFilter('part'),
    mainStat: setFilter('mainStat'),
    subStat: setFilter('subStat'),
    enhance: setFilter('enhance'),
    grade: setFilter('grade'),
    initialRolls: setFilter('initialRolls'),
    equipped: setFilter('equipped'),
    verified: setFilter('verified'),
    set: setFilter('set'),
  }), [setFilter])

  // 翻译函数：relicsTab namespace 通用文本 + RelicGrid 前缀的数值列文本
  const { t, i18n } = useTranslation('relicsTab')
  const { t: tValueColumn } = useTranslation('relicsTab', { keyPrefix: 'RelicGrid' })

  // 生成数值列下拉选项（带翻译），locale 变化时重新生成
  const valueColumnOptions = useMemo(() => generateValueColumnOptions(tValueColumn), [tValueColumn])

  // 各类型翻译函数，固定 locale/namespace/keyPrefix，语言切换时重新生成
  const locale = i18n.resolvedLanguage ?? languages.en_US.locale
  const tStats = useMemo(() => i18next.getFixedT(locale, 'common', 'Stats'), [locale])
  const tSets = useMemo(() => i18next.getFixedT(locale, 'gameData', 'RelicSets'), [locale])
  const tParts = useMemo(() => i18next.getFixedT(locale, 'common', 'Parts'), [locale])

  // 部位过滤选项：6个部位，带图标和翻译名
  const partOptions: FilterOption<Parts>[] = useMemo(() =>
    Object.values(Constants.Parts).map((part) => ({
      value: part,
      label: tParts(part),
      icon: <img src={Assets.getPart(part)} style={{ width: 22, height: 22 }} />,
    })), [tParts])

  // 强化等级过滤选项：0/3/6/9/12/15
  const enhanceOptions: FilterOption<number>[] = useMemo(() => [0, 3, 6, 9, 12, 15].map((n) => ({ value: n, label: `+${n}` })), [])

  // 稀有度过滤选项：5/4/3/2星
  const gradeOptions: FilterOption<number>[] = useMemo(() => [5, 4, 3, 2].map((n) => ({ value: n, label: `${n}★` })), [])

  // 初始词条数过滤选项：4词条 / 3词条
  const initialRollsOptions: FilterOption<number>[] = useMemo(() => [4, 3].map((n) => ({ value: n, label: `${n} substats` })), [])

  // 装备状态过滤选项：已装备 / 未装备
  const equippedOptions: FilterOption<boolean>[] = useMemo(() => [
    { value: true, label: t('RelicFilterBar.Equipped') },
    { value: false, label: t('RelicFilterBar.Unequipped') },
  ], [t])

  // 验证状态过滤选项：已验证（扫描导入）/ 未验证
  const verifiedOptions: FilterOption<boolean>[] = useMemo(() => [
    { value: true, label: t('RelicFilterBar.Verified') },
    { value: false, label: t('RelicFilterBar.Unverified') },
  ], [t])

  // 内部遗器套装选项（4件套），过滤掉未发布套装，带图标和翻译名
  const relicSetOptions: FilterOption<Sets>[] = useMemo(() =>
    Object.values(SetsRelics).filter((x) => !UnreleasedSets[x]).map((set) => ({
      value: set,
      label: tSets(`${setToId[set]}.Name`),
      icon: <img src={Assets.getSetImage(set, Constants.Parts.PlanarSphere)} style={{ width: 22, height: 22 }} />,
    })), [tSets])

  // 位面饰品套装选项（2件套），过滤掉未发布套装，带图标和翻译名
  const ornamentSetOptions: FilterOption<Sets>[] = useMemo(() =>
    Object.values(SetsOrnaments).filter((x) => !UnreleasedSets[x]).map((set) => ({
      value: set,
      label: tSets(`${setToId[set]}.Name`),
      icon: <img src={Assets.getSetImage(set, Constants.Parts.PlanarSphere)} style={{ width: 22, height: 22 }} />,
    })), [tSets])

  // 主词条过滤选项：所有合法主词条，带属性图标
  const mainStatOptions: FilterOption<MainStats>[] = useMemo(() =>
    Constants.MainStats.map((stat) => ({
      value: stat,
      label: isStatsValues(stat) ? tStats(stat) : stat,
      icon: <img src={Assets.getStatIcon(stat, true)} style={{ width: 22, height: 22 }} />,
    })), [tStats])

  // 副词条过滤选项：所有合法副词条，带属性图标
  const subStatOptions: FilterOption<SubStats>[] = useMemo(() =>
    Constants.SubStats.map((stat) => ({
      value: stat,
      label: isStatsValues(stat) ? tStats(stat) : stat,
      icon: <img src={Assets.getStatIcon(stat, true)} style={{ width: 22, height: 22 }} />,
    })), [tStats])

  // 把排除角色数组转成 Set，方便 CharacterMultiSelect 组件使用
  const excludedCharactersSet = useMemo(
    () => new Set(excludedRelicPotentialCharacters),
    [excludedRelicPotentialCharacters],
  )

  // 排除角色变更时：更新 store 并延迟保存到 localStorage
  function onExcludedCharactersChange(excluded: Set<CharacterId>) {
    setExcludedRelicPotentialCharacters([...excluded])
    SaveState.delayedSave()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'center' }}>
      {/* 8-column grid for both rows so widths align perfectly */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr) auto', gap: 5, alignItems: 'center' }}>
        {/* Row 1: 8 × 1-unit pills */}
        <FilterPill label={t('RelicFilterBar.Part')} options={partOptions} selected={filters.part} onChange={filterHandlers.part} />
        <FilterPill label={t('RelicFilterBar.Mainstat')} options={mainStatOptions} selected={filters.mainStat} onChange={filterHandlers.mainStat} searchable />
        <FilterPill label={t('RelicFilterBar.Substat')} options={subStatOptions} selected={filters.subStat} onChange={filterHandlers.subStat} searchable />
        <FilterPill label={t('RelicFilterBar.Enhance')} options={enhanceOptions} selected={filters.enhance} onChange={filterHandlers.enhance} />
        <FilterPill label={t('RelicFilterBar.Grade')} options={gradeOptions} selected={filters.grade} onChange={filterHandlers.grade} />
        <FilterPill
          label={t('RelicFilterBar.InitialRolls')}
          options={initialRollsOptions}
          selected={filters.initialRolls}
          onChange={filterHandlers.initialRolls}
        />
        <FilterPill label={t('RelicFilterBar.Equipped')} options={equippedOptions} selected={filters.equipped} onChange={filterHandlers.equipped} />
        <FilterPill label={t('RelicFilterBar.Verified')} options={verifiedOptions} selected={filters.verified} onChange={filterHandlers.verified} />
        <div style={{ marginLeft: 4 }}>
          <TooltipImage type={Hint.relics()} />
        </div>

        {/* Row 2: 4 × 2-unit items (each spans 2 grid columns) */}
        <div style={{ gridColumn: 'span 2' }}>
          <FilterPill
            label={t('RelicFilterBar.RelicSets')}
            options={relicSetOptions}
            selected={filters.set}
            onChange={filterHandlers.set}
            searchable
            columns={2}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <FilterPill
            label={t('RelicFilterBar.OrnamentSets')}
            options={ornamentSetOptions}
            selected={filters.set}
            onChange={filterHandlers.set}
            searchable
            columns={2}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <CharacterMultiSelect
            value={excludedCharactersSet}
            selectStyle={{ width: '100%' }}
            onChange={onExcludedCharactersChange}
            maxDisplayedValues={0}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <MultiSelectPills
            clearable
            size='xs'
            value={valueColumns}
            onChange={(values) => setValueColumns(values as typeof valueColumns)}
            data={valueColumnOptions.map((group) => ({
              group: group.label,
              items: group.options.map((opt) => ({ value: opt.value, label: opt.label })),
            }))}
            maxDropdownHeight={750}
            dropdownWidth='fit-content'
          />
        </div>
        <div style={{ marginLeft: 4 }}>
          <TooltipImage type={Hint.valueColumns()} />
        </div>
      </div>
    </div>
  )
}
