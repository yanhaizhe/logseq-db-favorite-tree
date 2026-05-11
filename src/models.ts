import type { FavoriteTreePlugin } from './plugin'

export function createModels(plugin: FavoriteTreePlugin) {
  return {
    toggleFavoriteTree: () => {
      void plugin.togglePanel()
    },

    sidebarTreeToggle: (event: { dataset?: Record<string, string> }) => {
      const key = event.dataset?.key
      if (key) {
        void plugin.onNodeToggle(key)
      }
    },

    sidebarTreeOpenPage: (event: { dataset?: Record<string, string> }) => {
      const page = event.dataset?.page
      if (page) {
        plugin.openPage(page)
      }
    },

    sidebarTreeSearchInput: (event: any) => {
      const value = event.value || ''
      void plugin.setSearchQuery(value)
    },

    sidebarTreeCreateChildInput: (event: any) => {
      const value = event.value || ''
      plugin.setCreateChildDraftTitle(value)
    },

    sidebarTreeCreateChildPage: (event: { dataset?: Record<string, string> }) => {
      const page = event.dataset?.page
      if (page) {
        void plugin.createChildPage(page)
      }
    },

    sidebarTreeSubmitCreateChild: () => {
      void plugin.submitCreateChildPage()
    },

    sidebarTreeCancelCreateChild: () => {
      plugin.cancelCreateChildPage()
    },

    sidebarTreeOpenPageInSidebar: (event: { dataset?: Record<string, string> }) => {
      const page = event.dataset?.page
      if (page) {
        void plugin.openPageInRightSidebar(page)
      }
    },

    sidebarTreeToggleSortMode: (event: { dataset?: Record<string, string> }) => {
      const parentKey = event.dataset?.parentKey
      if (parentKey) {
        plugin.toggleSortModeForParent(parentKey)
      }
    },

    sidebarTreeClearCustomSort: (event: { dataset?: Record<string, string> }) => {
      const parentKey = event.dataset?.parentKey
      if (parentKey) {
        plugin.clearCustomSortForParent(parentKey)
      }
    },

    sidebarTreeShowFloating: () => {
      void plugin.switchDisplayMode()
    },

    sidebarTreeToggleControls: () => {
      plugin.toggleControlsCollapsed()
    },

    sidebarTreeRefresh: () => {
      void plugin.manualRefresh()
    },

    sidebarTreeCollapseToBubble: () => {
      void plugin.collapseToBubble()
    },

    sidebarTreeOpenSettings: () => {
      plugin.openSettings()
    },

    sidebarTreeClose: () => {
      plugin.closePanel()
    },

    sidebarTreeLocateCurrent: () => {
      void plugin.locateCurrentPage()
    },

    sidebarTreeFocusCurrentPath: () => {
      void plugin.focusCurrentPath()
    },

    sidebarTreeCollapseOtherBranches: () => {
      void plugin.collapseOtherBranches()
    },

    sidebarTreeFocusPreviousSearchMatch: () => {
      plugin.focusPreviousSearchMatch()
    },

    sidebarTreeFocusNextSearchMatch: () => {
      plugin.focusNextSearchMatch()
    },

    sidebarTreeResetPanelSize: () => {
      plugin.resetPanelSize()
    },

    sidebarTreeToggleExpandAll: () => {
      void plugin.toggleExpandCollapseAll()
    },

    sidebarTreeToggleAutoRefresh: () => {
      plugin.toggleAutoRefresh()
    },
  }
}
