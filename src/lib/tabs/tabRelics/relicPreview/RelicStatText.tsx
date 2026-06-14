import { type Languages } from 'lib/utils/i18nUtils'
import {
  type CSSProperties, // TS类型：描述CSS样式对象结构，提供自动补全和类型检查，编译后不产生代码
  memo,               // 组件级缓存：props不变则跳过整个组件的重新渲染
  useMemo,            // 计算级缓存：依赖项不变则跳过组件内部某个值的重新计算
} from 'react'

// Pre-computed styles for languages with longer text
const COMPACT_STYLE: CSSProperties = { whiteSpace: 'nowrap', fontSize: 13, lineHeight: '22px' }
const DEFAULT_STYLE: CSSProperties = { whiteSpace: 'nowrap' }
// Partial<T>：把 T 的所有字段变为可选，不需要填满所有 key
// 这里只有三种语言文字较长需要压缩字号，其余语言查到 undefined 则走默认样式
const LANGUAGE_STYLES: Partial<Record<Languages, CSSProperties>> = {
  fr_FR: COMPACT_STYLE,
  pt_BR: COMPACT_STYLE,
  vi_VN: COMPACT_STYLE,
}

// 定义组件的 props 类型：继承 div 的所有原生属性（style/className/onClick等），再额外加一个可选的 language
// & 是交叉类型，表示"两者都要有"；? 表示可选
type RelicStatTextProps = React.HTMLAttributes<HTMLDivElement> & { language?: Languages }

// memo(fn) 包裹普通函数组件，返回带缓存能力的新组件：props 不变则跳过重新渲染
export const RelicStatText = memo(function RelicStatText(props: RelicStatTextProps) {
  const { language, style, ...rest } = props              // 解构 props，...rest 收集剩余所有字段
  const baseStyle = language ? (LANGUAGE_STYLES[language] ?? DEFAULT_STYLE) : DEFAULT_STYLE // 根据语言选基础样式

  const mergedStyle = useMemo(                            // useMemo 缓存：合并基础样式和外部传入的 style
    () => (style ? { ...baseStyle, ...style as CSSProperties } : baseStyle), // 外部 style 写在后面，优先级更高会覆盖基础样式
    [baseStyle, style],                                   // 依赖项：两者任一变化才重新计算
  )

  return <div style={mergedStyle} {...rest} />            // 返回 JSX，...rest 把剩余 props 原样透传给 div
})
