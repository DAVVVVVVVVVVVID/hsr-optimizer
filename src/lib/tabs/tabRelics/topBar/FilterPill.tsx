// Mantine UI 组件库：提供现成的界面组件
import {
  Badge,      // 小圆角标签，显示已选过滤条件数量
  Button,     // 按钮，FilterPill 本体
  Checkbox,   // 复选框，下拉列表每个选项的勾选框
  Combobox,   // 下拉选择框容器，管理打开/关闭状态
  Group,      // 水平排列子元素的布局容器
  useCombobox, // Mantine Hook，管理下拉框的交互状态
} from '@mantine/core'
// 图标库
import { IconFilter } from '@tabler/icons-react' // 漏斗形过滤图标，显示在按钮左侧
// React 核心
import {
  memo,            // 组件级缓存，props 不变跳过重渲染
  type ReactNode,  // TS 类型：任何可以被 React 渲染的东西（字符串/数字/JSX/null 等）
  useMemo,         // 计算级缓存，依赖不变跳过重新计算
  useState,        // 本文件重点：管理组件内部状态（下拉框开关、搜索关键词）
} from 'react'

export type FilterOption<T> = {
  value: T,
  label: string,
  icon?: ReactNode,
}

type FilterPillProps<T> = {
  label: string,
  options: FilterOption<T>[],
  selected: T[],
  onChange: (values: T[]) => void,
  searchable?: boolean,
  flex?: number,
  columns?: number,
}

function FilterPillInner<T extends string | number | boolean>({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  flex = 1,
  columns = 1,
}: FilterPillProps<T>) {
  // useState(初始值) → [状态值, 修改函数]
  // search：搜索框当前输入内容；setSearch：修改它并触发重新渲染
  const [search, setSearch] = useState('')
  const optionValues = useMemo(() => new Set(options.map((o) => o.value)), [options])
  const activeCount = useMemo(() => selected.filter((v) => optionValues.has(v)).length, [selected, optionValues])

  // Mantine 提供的下拉框状态管理 Hook，返回 combobox 对象用于控制下拉框行为
  // onDropdownOpen：打开时若可搜索则自动聚焦搜索框，用户可直接打字
  // onDropdownClose：关闭时清空搜索词（search 是临时的，不需要保留）并重置高亮选项
  const combobox = useCombobox({
    onDropdownOpen: () => {
      if (searchable) combobox.focusSearchInput()
    },
    onDropdownClose: () => {
      setSearch('')
      combobox.resetSelectedOption()
    },
  })

  // 点击选项时的勾选/取消函数
  // 已选中 → filter 移除该值（取消勾选）；未选中 → 展开追加该值（勾选）
  // 不直接修改 selected，而是调用 onChange 通知父组件，数据由父组件管理
  const toggle = (value: T) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)  // 取消勾选：移除
      : [...selected, value]                 // 勾选：追加
    onChange(next)
  }

  // 根据搜索词过滤选项列表，search 或 options 变化时重新计算
  // 无搜索词直接返回全部选项；有搜索词则保留 label 包含关键词的选项
  // toLowerCase 保证大小写不敏感匹配
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options                                          // 无搜索词，返回全部
    const lower = search.toLowerCase().trim()
    return options.filter((opt) => opt.label.toLowerCase().includes(lower))    // 按关键词过滤
  }, [options, search])

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        // Find the option by string value and toggle it
        const opt = options.find((o) => String(o.value) === val)
        if (opt) toggle(opt.value)
        // Don't close — let user select multiple
      }}
    >
      <Combobox.Target>
        <Button
          variant={activeCount > 0 ? 'light' : 'default'}
          size='xs'
          onClick={() => combobox.toggleDropdown()}
          leftSection={<IconFilter size={12} />}
          rightSection={activeCount > 0 ? <Badge size='xs' circle variant='filled'>{activeCount}</Badge> : undefined}
          style={{ flex, minWidth: 0, width: '100%' }}
        >
          {label}
        </Button>
      </Combobox.Target>

      <Combobox.Dropdown style={{ minWidth: 'max-content' }}>
        {searchable && (
          <Combobox.Search
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder='Search...'
          />
        )}
        <Combobox.Options
          mah={800}
          style={{
            overflowY: 'auto',
            ...(columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` } : {}),
          }}
        >
          {combobox.dropdownOpened && filteredOptions.map((opt) => {
            const isSelected = selected.includes(opt.value)
            return (
              <Combobox.Option key={String(opt.value)} value={String(opt.value)} active={isSelected}>
                <Group gap={8} wrap='nowrap'>
                  <Checkbox
                    size='xs'
                    checked={isSelected}
                    onChange={() => {}}
                    tabIndex={-1}
                    styles={{ input: { cursor: 'pointer' } }}
                  />
                  {opt.icon && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, flexShrink: 0 }}>
                      {opt.icon}
                    </div>
                  )}
                  <span style={{ whiteSpace: 'nowrap' }}>{opt.label}</span>
                </Group>
              </Combobox.Option>
            )
          })}
          {combobox.dropdownOpened && filteredOptions.length === 0 && <Combobox.Empty>No results</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}

export const FilterPill = memo(FilterPillInner) as typeof FilterPillInner
