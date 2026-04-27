import '@logseq/libs'
import './style.css'
import { buildSettingsSchema } from './constants'
import { getFavoriteTreeI18n } from './i18n'
import { FavoriteTreePlugin } from './plugin'
import { registerToolbar } from './toolbar'
import { wireDOMEvents } from './wire-dom-events'

async function main(): Promise<void> {
  const i18n = await getFavoriteTreeI18n()
  logseq.useSettingsSchema(buildSettingsSchema(i18n))

  const root = document.getElementById('app')
  if (!root) {
    throw new Error(i18n.t('mountPointMissing'))
  }

  const plugin = new FavoriteTreePlugin(root, i18n)
  wireDOMEvents(root, {
    onStartDrag: plugin.startDrag,
    onHeaderDoubleClick: () => {
      void plugin.collapseToBubble()
    },
    onSearchQueryChange: (value) => {
      void plugin.setSearchQuery(value)
    },
    onToggleControls: plugin.toggleControlsCollapsed,
    onSwitchDisplayMode: () => {
      void plugin.switchDisplayMode()
    },
    onResetPanelSize: plugin.resetPanelSize,
    onRefresh: () => {
      void plugin.manualRefresh()
    },
    onToggleAutoRefresh: plugin.toggleAutoRefresh,
    onToggleExpandAll: () => {
      void plugin.toggleExpandCollapseAll()
    },
    onLocateCurrent: () => {
      void plugin.locateCurrentPage()
    },
    onFocusCurrentPath: () => {
      void plugin.focusCurrentPath()
    },
    onCollapseOtherBranches: () => {
      void plugin.collapseOtherBranches()
    },
    onFocusPreviousSearchMatch: plugin.focusPreviousSearchMatch,
    onFocusNextSearchMatch: plugin.focusNextSearchMatch,
    onOpenSettings: plugin.openSettings,
    onCollapseToBubble: () => {
      void plugin.collapseToBubble()
    },
    onExpandPanel: () => {
      void plugin.expandFromBubble()
    },
    onClose: plugin.closePanel,
    onToggleNode: (key) => {
      void plugin.onNodeToggle(key)
    },
    onOpenPage: plugin.openPage,
    onOpenPageInSidebar: (page) => {
      void plugin.openPageInRightSidebar(page)
    },
    onToggleSortMode: plugin.toggleSortModeForParent,
    onClearCustomSort: plugin.clearCustomSortForParent,
    onStartSortDrag: plugin.startSortDrag,
    onMoveSortDropTarget: plugin.moveSortDropTarget,
    onFinishSortDrop: plugin.finishSortDrop,
    onEndSortDrag: plugin.endSortDrag,
    shouldIgnoreBubbleClick: plugin.shouldIgnoreBubbleClick,
  })
  registerToolbar(plugin.togglePanel, i18n)

  await plugin.init()
}

logseq.ready(main).catch(async (error) => {
  const i18n = await getFavoriteTreeI18n()
  console.error(error)
  logseq.UI.showMsg(i18n.t('startupFailed', { message: String(error) }), 'error')
})
