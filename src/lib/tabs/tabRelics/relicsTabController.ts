// ag-grid 表格库的类型：行节点、键盘导航参数、行双击事件、选中变更事件
import {
  type IRowNode,
  type NavigateToNextCellParams,
  type RowDoubleClickedEvent,
  type SelectionChangedEvent,
} from 'ag-grid-community'
import i18next from 'i18next'                                                    // 国际化，用于读取当前语言的翻译文本
import { arrowKeyGridNavigation } from 'lib/interactions/arrowKeyGridNavigation' // 方向键在表格中移动选中行的逻辑
import { Message } from 'lib/interactions/message'                               // 显示 toast 提示消息
import { RelicModalController } from 'lib/overlays/modals/relicModal/relicModalController' // 遗器编辑弹窗的控制器
import { useRelicModalStore } from 'lib/overlays/modals/relicModal/relicModalStore'        // 遗器弹窗的 Zustand store
import { type ScoredRelic } from 'lib/relics/scoreRelics'                        // 带评分数据的遗器类型
import * as equipmentService from 'lib/services/equipmentService'                // 装备/卸载遗器的业务逻辑服务
import { SaveState } from 'lib/state/saveState'                                  // 持久化：延迟写入 localStorage
import { gridStore } from 'lib/stores/gridStore'                                 // ag-grid 实例的全局引用，用于命令式操作表格
import { getRelicById } from 'lib/stores/relic/relicStore'                       // 通过 ID 从全局遗器列表中查找遗器
import { useRelicsTabStore } from 'lib/tabs/tabRelics/useRelicsTabStore'         // 本 Tab 的 Zustand store
import type { Relic } from 'types/relic'                                         // 遗器完整数据结构类型

export const RelicsTabController = {
  // ── AG Grid 表格交互回调 ──────────────────────────────────────────

  // 点击行节点时设为选中状态（供方向键导航调用）
  nodeClickedCallback(node: IRowNode<ScoredRelic>) {
    node.setSelected(true, true)
  },

  // 双击某行：同步选中 ID 到 store，并打开编辑弹窗
  onRowDoubleClicked(e: RowDoubleClickedEvent<ScoredRelic>) {
    const relic = e.data
    if (!relic) return
    useRelicsTabStore.getState().setSelectedRelicsIds([relic.id])
    useRelicModalStore.getState().openOverlay({
      selectedRelic: relic,
      onOk: RelicsTabController.onRelicModalOk,
    })
  },

  // 选中行变化时：把当前所有选中行的 ID 同步到 store
  onSelectionChanged(e: SelectionChangedEvent<ScoredRelic>) {
    useRelicsTabStore.getState().setSelectedRelicsIds((e.api.getSelectedRows() as ScoredRelic[]).map((row) => row.id))
  },

  // 方向键导航：交给 arrowKeyGridNavigation 处理，移动后触发 nodeClickedCallback 更新选中
  navigateToNextCell(params: NavigateToNextCellParams<ScoredRelic>) {
    return arrowKeyGridNavigation(params, gridStore.getRelicsGrid()!, RelicsTabController.nodeClickedCallback)
  },

  // ── 工具栏按钮操作 ───────────────────────────────────────────────

  // 点"编辑"按钮：校验有选中遗器，打开编辑弹窗
  editClicked() {
    const { selectedRelicId } = useRelicsTabStore.getState()
    const t = i18next.getFixedT(null, 'relicsTab', 'Messages')
    if (!selectedRelicId) return Message.error(t('NoRelicSelected'))
    const relic = getRelicById(selectedRelicId)
    if (!relic) return
    useRelicModalStore.getState().openOverlay({
      selectedRelic: relic,
      onOk: RelicsTabController.onRelicModalOk,
    })
  },

  // 点"新增"按钮：清空选中状态，打开空白新增弹窗
  addClicked() {
    useRelicsTabStore.getState().setSelectedRelicsIds([])
    useRelicModalStore.getState().openOverlay({
      selectedRelic: null,
      onOk: RelicsTabController.onRelicModalOk,
    })
  },

  // 确认删除：批量删除所有选中遗器，持久化，显示成功提示
  deleteConfirmed() {
    const { selectedRelicsIds, setSelectedRelicsIds } = useRelicsTabStore.getState()
    const t = i18next.getFixedT(null, 'relicsTab', 'Messages')
    if (!selectedRelicsIds.length) return Message.error(t('NoRelicSelected'))
    setSelectedRelicsIds([])
    selectedRelicsIds.forEach((id) => equipmentService.removeRelic(id))
    SaveState.permitEmptySave()
    SaveState.delayedSave()
    Message.success(t('DeleteRelicSuccess'))
  },

  // ── 弹窗确认回调 ────────────────────────────────────────────────

  // 弹窗点确认时触发：
  //   有 selectedRelicId → 编辑模式，更新已有遗器
  //   无 selectedRelicId → 新增模式，插入遗器并滚动表格到新行
  onRelicModalOk(relic: Relic) {
    const { selectedRelicId, setSelectedRelicsIds } = useRelicsTabStore.getState()
    const t = i18next.getFixedT(null, 'relicsTab', 'Messages')
    if (selectedRelicId) {
      const oldRelic = getRelicById(selectedRelicId)
      if (!oldRelic) return
      RelicModalController.onEditOk(oldRelic, relic)
    } else {
      equipmentService.upsertRelicWithEquipment(relic)
      setSelectedRelicsIds([relic.id])
      SaveState.delayedSave()
      Message.success(t('AddRelicSuccess'))

      // setTimeout(0)：等本次渲染完成后再操作表格，确保新行已存在于 DOM
      setTimeout(() => {
        const api = gridStore.relicsGridApi()
        if (!api) return
        const node = api.getRowNode(relic.id)
        if (!node) return
        node.setSelected(true, true)
        api.ensureNodeVisible(node)  // 滚动表格使新行可见
      }, 0)
    }
  },
}
