import '@logseq/libs'
import './style.css'
import { SETTINGS_SCHEMA } from './constants'
import { FavoriteTreePlugin } from './plugin'
import { registerToolbar } from './toolbar'
import { wireDOMEvents } from './wire-dom-events'

async function main(): Promise<void> {
  logseq.useSettingsSchema(SETTINGS_SCHEMA)

  const root = document.getElementById('app')
  if (!root) {
    throw new Error('插件挂载点不存在')
  }

  const plugin = new FavoriteTreePlugin(root)
  wireDOMEvents(root, {
    onStartDrag: plugin.startDrag,
    onHeaderDoubleClick: plugin.collapseToBubble,
    onSearchQueryChange: (value) => {
      void plugin.setSearchQuery(value)
    },
    onToggleControls: plugin.toggleControlsCollapsed,
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
    onOpenSettings: plugin.openSettings,
    onCollapseToBubble: plugin.collapseToBubble,
    onExpandPanel: () => {
      void plugin.expandFromBubble()
    },
    onClose: plugin.closePanel,
    onToggleNode: (key) => {
      void plugin.onNodeToggle(key)
    },
    onOpenPage: plugin.openPage,
    shouldIgnoreBubbleClick: plugin.shouldIgnoreBubbleClick,
  })
  registerToolbar(plugin.togglePanel)

  logseq.beforeunload(async () => {
    plugin.destroy()
  })

  await plugin.init()
}

logseq.ready(main).catch((error) => {
  console.error(error)
  logseq.UI.showMsg(`DB Favorite Tree 启动失败: ${String(error)}`, 'error')
})
