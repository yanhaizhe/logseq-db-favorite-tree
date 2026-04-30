import '@logseq/libs'
import './style.css'
import { buildSettingsSchema } from './constants'
import { getFavoriteTreeI18n } from './i18n'
import { createModels } from './models'
import { FavoriteTreePlugin } from './plugin'
import { SIDEBAR_TREE_HOST_STYLE } from './sidebar-render'
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

  logseq.provideModel(createModels(plugin))
  logseq.provideStyle({
    key: 'db-favorite-tree-left-sidebar-style',
    style: SIDEBAR_TREE_HOST_STYLE,
  })

  registerToolbar(i18n)

  wireDOMEvents(root, {
    onStartDrag: plugin.startDrag,
    onHeaderDoubleClick: () => {
      void plugin.collapseToBubble()
    },
    onSearchQueryChange: (value) => {
      void plugin.setSearchQuery(value)
    },
    onCreateChildDraftChange: plugin.setCreateChildDraftTitle,
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
    onCreateChildPage: (page) => {
      void plugin.createChildPage(page)
    },
    onSubmitCreateChild: () => {
      void plugin.submitCreateChildPage()
    },
    onCancelCreateChild: plugin.cancelCreateChildPage,
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

  await plugin.init()

  logseq.beforeunload(async () => {
    plugin.destroy()
  })
}

logseq.ready(main).catch(async (error) => {
  const i18n = await getFavoriteTreeI18n()
  console.error(error)
  logseq.UI.showMsg(i18n.t('startupFailed', { message: String(error) }), 'error')
})
