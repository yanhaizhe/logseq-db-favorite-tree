import type { ThemeMode } from '@logseq/libs/dist/LSPlugin'
import { REFRESH_DEBOUNCE_MS } from './constants'
import { FloatingLayoutManager } from './floating-layout'
import { renderFavoriteTree } from './render'
import { FavoriteTreeSettingsStore } from './settings'
import { FavoriteTreeTreeService } from './tree-service'
import type { DragKind, LoadState, PluginSettings, TreeStateSnapshot, ViewMode } from './types'
import { applyTheme } from './theme'
import { escapeSelectorValue, normalizeTitle } from './utils'

export class FavoriteTreePlugin {
  private currentGraphKey = 'default'
  private panelVisible = false
  private viewMode: ViewMode = 'panel'
  private refreshing = false
  private searching = false
  private searchQuery = ''
  private currentPageName: string | null = null
  private currentPagePath: string[] = []
  private currentThemeMode: ThemeMode = 'light'
  private rootFavorites: string[] = []
  private autoRefreshPaused = false
  private bodyScrollTop = 0
  private lastLocatedNodeKey: string | null = null
  private flashLocatedNodeKey: string | null = null
  private suppressBubbleClick = false
  private readonly expandedKeys = new Set<string>()
  private readonly loadedKeys = new Set<string>()
  private readonly loadStates = new Map<string, LoadState>()
  private readonly loadErrors = new Map<string, string>()
  private refreshTimerId: number | null = null
  private routeTimerId: number | null = null
  private pollTimerId: number | null = null
  private flashTimerId: number | null = null
  private lastRefreshLabel = '尚未刷新'
  private offHooks: Array<() => void> = []

  private readonly settings = new FavoriteTreeSettingsStore()
  private readonly treeService = new FavoriteTreeTreeService()
  private readonly layout = new FloatingLayoutManager(() => {
    this.applyMainUIState()
  })

  constructor(private readonly root: HTMLElement) {}

  async init(): Promise<void> {
    await this.initializeGraphContext()

    window.addEventListener('pointermove', this.handlePointerMove)
    window.addEventListener('pointerup', this.handlePointerUp)
    window.addEventListener('pointercancel', this.handlePointerUp)
    window.addEventListener('resize', this.handleWindowResize)

    this.render()
    this.applyMainUIState()
    this.syncTheme()
    await this.refresh('startup')
    await this.updateCurrentPage()
    this.registerHooks()
    this.startPolling()

    if (this.panelVisible) {
      logseq.showMainUI({ autoFocus: false })
    }
  }

  destroy(): void {
    this.persistInternalState()
    this.layout.destroy()
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId)
    }
    if (this.routeTimerId !== null) {
      window.clearTimeout(this.routeTimerId)
    }
    if (this.pollTimerId !== null) {
      window.clearInterval(this.pollTimerId)
    }
    if (this.flashTimerId !== null) {
      window.clearTimeout(this.flashTimerId)
    }
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('pointerup', this.handlePointerUp)
    window.removeEventListener('pointercancel', this.handlePointerUp)
    window.removeEventListener('resize', this.handleWindowResize)
    for (const off of this.offHooks) {
      off()
    }
  }

  togglePanel = async (): Promise<void> => {
    this.panelVisible = !this.panelVisible
    this.layout.ensureInViewport(this.settings.getPanelWidth(), this.settings.getSidebarPosition())
    this.persistInternalState()
    this.applyMainUIState()
    this.render()

    if (this.panelVisible) {
      await this.refresh(this.viewMode === 'bubble' ? 'bubble-open' : 'panel-open')
      await this.updateCurrentPage()
    }
  }

  closePanel = (): void => {
    if (!this.panelVisible) {
      return
    }

    this.panelVisible = false
    this.persistInternalState()
    this.applyMainUIState()
    this.render()
  }

  collapseToBubble = (): void => {
    if (this.viewMode === 'bubble') {
      return
    }

    this.captureBodyScrollTop()
    this.viewMode = 'bubble'
    this.layout.ensureInViewport(this.settings.getPanelWidth(), this.settings.getSidebarPosition())
    this.persistInternalState()
    this.applyMainUIState()
    this.render()
  }

  expandFromBubble = async (): Promise<void> => {
    this.panelVisible = true
    this.viewMode = 'panel'
    this.layout.ensureInViewport(this.settings.getPanelWidth(), this.settings.getSidebarPosition())
    this.persistInternalState()
    this.applyMainUIState()
    this.render()
    await this.refresh('bubble-expand')
    await this.updateCurrentPage()
  }

  openSettings = (): void => {
    logseq.showSettingsUI()
  }

  manualRefresh = async (): Promise<void> => {
    await this.refresh('manual')
  }

  toggleAutoRefresh = (): void => {
    this.autoRefreshPaused = !this.autoRefreshPaused
    this.persistInternalState()
    this.startPolling()
    this.render()
  }

  setSearchQuery = async (value: string): Promise<void> => {
    const nextQuery = value.trim()
    this.searchQuery = nextQuery

    if (!nextQuery) {
      this.searching = false
      this.render()
      return
    }

    this.searching = !this.treeService.hasChildIndex()
    this.render()

    await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())
    if (this.searchQuery !== nextQuery) {
      return
    }

    this.searching = false
    this.render()
  }

  toggleExpandCollapseAll = async (): Promise<void> => {
    if (this.hasExpandedNodes()) {
      this.collapseAll()
      return
    }
    await this.expandAll()
  }

  expandAll = async (): Promise<void> => {
    await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())

    for (const key of this.treeService.collectReachableExpandableKeys(this.rootFavorites)) {
      this.expandedKeys.add(key)
      this.loadedKeys.add(key)
      this.loadStates.set(key, 'loaded')
      this.loadErrors.delete(key)
    }

    this.persistInternalState()
    this.render()
  }

  collapseAll = (): void => {
    this.expandedKeys.clear()
    this.persistInternalState()
    this.render()
  }

  locateCurrentPage = async (): Promise<void> => {
    await this.updateCurrentPage()

    if (!this.currentPageName) {
      logseq.UI.showMsg('当前没有可定位的页面。', 'warning')
      return
    }

    await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())
    const path = this.treeService.findPathToPage(this.rootFavorites, this.currentPageName)
    if (!path) {
      logseq.UI.showMsg('当前页不在收藏树中。', 'warning')
      return
    }

    for (const title of path.slice(0, -1)) {
      const key = normalizeTitle(title)
      if (!key) {
        continue
      }
      this.expandedKeys.add(key)
      this.loadedKeys.add(key)
      this.loadStates.set(key, 'loaded')
      this.loadErrors.delete(key)
    }

    this.persistInternalState()
    this.render()
    this.scrollNodeIntoView(normalizeTitle(this.currentPageName))
  }

  onNodeToggle = async (nodeKey: string): Promise<void> => {
    if (this.expandedKeys.has(nodeKey)) {
      this.expandedKeys.delete(nodeKey)
      this.persistInternalState()
      this.render()
      return
    }

    this.expandedKeys.add(nodeKey)
    this.persistInternalState()
    this.render()

    if (this.loadedKeys.has(nodeKey)) {
      return
    }

    this.loadStates.set(nodeKey, 'loading')
    this.loadErrors.delete(nodeKey)
    this.render()

    try {
      await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())
      this.loadedKeys.add(nodeKey)
      this.loadStates.set(nodeKey, 'loaded')
    } catch (error) {
      this.loadStates.set(nodeKey, 'error')
      this.loadErrors.set(nodeKey, error instanceof Error ? error.message : '子节点加载失败')
    }

    this.render()
  }

  openPage = (pageName: string): void => {
    logseq.App.pushState('page', { name: pageName })
  }

  startDrag = (kind: DragKind, event: PointerEvent, handleElement: HTMLElement | null): void => {
    this.layout.startDrag(kind, event, handleElement)
  }

  shouldIgnoreBubbleClick = (): boolean => {
    if (!this.suppressBubbleClick) {
      return false
    }
    this.suppressBubbleClick = false
    return true
  }

  private registerHooks(): void {
    this.offHooks.push(
      logseq.DB.onChanged(() => {
        this.scheduleRefresh('db-changed')
      }),
    )

    this.offHooks.push(
      logseq.App.onRouteChanged(() => {
        if (this.routeTimerId !== null) {
          window.clearTimeout(this.routeTimerId)
        }
        this.routeTimerId = window.setTimeout(() => {
          void this.updateCurrentPage()
        }, 120)
      }),
    )

    this.offHooks.push(
      logseq.App.onThemeModeChanged(({ mode }) => {
        this.currentThemeMode = mode
        this.syncTheme()
      }),
    )

    this.offHooks.push(
      logseq.App.onCurrentGraphChanged(() => {
        void this.handleGraphChanged()
      }),
    )

    this.offHooks.push(
      logseq.onSettingsChanged<PluginSettings>((newSettings, oldSettings) => {
        const propertyChanged = newSettings.hierarchyProperty !== oldSettings?.hierarchyProperty
        const widthChanged = newSettings.panelWidth !== oldSettings?.panelWidth
        const pollIntervalChanged = newSettings.pollIntervalSeconds !== oldSettings?.pollIntervalSeconds
        const positionChanged = newSettings.sidebarPosition !== oldSettings?.sidebarPosition

        if (propertyChanged) {
          this.treeService.invalidateIndex()
          void this.refresh('settings-property')
        }

        if (widthChanged || positionChanged) {
          this.layout.ensureInViewport(this.settings.getPanelWidth(), this.settings.getSidebarPosition())
          this.applyMainUIState()
        }

        if (pollIntervalChanged) {
          this.startPolling()
        }

        this.render()
      }),
    )
  }

  private startPolling(): void {
    if (this.pollTimerId !== null) {
      window.clearInterval(this.pollTimerId)
      this.pollTimerId = null
    }

    if (this.autoRefreshPaused) {
      return
    }

    const pollIntervalMs = this.settings.getPollIntervalSeconds() * 1000
    this.pollTimerId = window.setInterval(() => {
      void this.refresh('poll')
    }, pollIntervalMs)
  }

  private scheduleRefresh(reason: string): void {
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId)
    }

    this.refreshTimerId = window.setTimeout(() => {
      void this.refresh(reason)
    }, REFRESH_DEBOUNCE_MS)
  }

  private async refresh(reason: string): Promise<void> {
    if (this.refreshing) {
      return
    }

    this.refreshing = true
    this.render()

    try {
      this.rootFavorites = await this.treeService.loadFavoriteRoots()
      this.treeService.invalidateIndex()
      await this.syncDerivedTreeState()

      this.lastRefreshLabel = this.formatRefreshLabel(reason)
    } catch (error) {
      const message = error instanceof Error ? error.message : '刷新失败'
      this.lastRefreshLabel = `刷新失败: ${message}`
      logseq.UI.showMsg(`DB Favorite Tree 刷新失败: ${message}`, 'warning')
    } finally {
      this.refreshing = false
      this.render()
    }
  }

  private async updateCurrentPage(): Promise<void> {
    const current = await logseq.Editor.getCurrentPage()
    this.currentPageName = current && typeof current === 'object' ? normalizeCurrentPageTitle(current) : null
    await this.syncCurrentPagePath()
    this.render()
  }

  private render(): void {
    this.captureBodyScrollTop()
    const activeElement = document.activeElement
    const shouldRestoreSearchFocus =
      activeElement instanceof HTMLInputElement && activeElement.dataset.role === 'search-input'
    const selectionStart = shouldRestoreSearchFocus ? activeElement.selectionStart ?? this.searchQuery.length : null
    const selectionEnd = shouldRestoreSearchFocus ? activeElement.selectionEnd ?? this.searchQuery.length : null

    this.root.innerHTML = renderFavoriteTree(this.getRenderState(), {
      getChildrenFor: (title) => this.treeService.getChildrenFor(title),
    })

    const body = this.getBodyElement()
    if (body) {
      body.scrollTop = this.bodyScrollTop
      body.addEventListener('scroll', this.handleBodyScroll, { passive: true })
    }

    if (shouldRestoreSearchFocus) {
      const nextInput = this.root.querySelector<HTMLInputElement>('[data-role="search-input"]')
      if (nextInput) {
        nextInput.focus({ preventScroll: true })
        nextInput.setSelectionRange(selectionStart, selectionEnd)
      }
    }
  }

  private getRenderState(): TreeStateSnapshot {
    return {
      rootFavorites: this.rootFavorites,
      expandedKeys: this.expandedKeys,
      loadedKeys: this.loadedKeys,
      loadStates: this.loadStates,
      loadErrors: this.loadErrors,
      currentPageName: this.currentPageName,
      currentPagePath: this.currentPagePath,
      lastLocatedNodeKey: this.lastLocatedNodeKey,
      flashLocatedNodeKey: this.flashLocatedNodeKey,
      refreshing: this.refreshing,
      searching: this.searching,
      searchQuery: this.searchQuery,
      autoRefreshPaused: this.autoRefreshPaused,
      pollIntervalSeconds: this.settings.getPollIntervalSeconds(),
      hierarchyProperty: this.settings.getHierarchyProperty(),
      lastRefreshLabel: this.lastRefreshLabel,
      viewMode: this.viewMode,
    }
  }

  private hasExpandedNodes(): boolean {
    return this.expandedKeys.size > 0
  }

  private scrollNodeIntoView(nodeKey: string): void {
    this.lastLocatedNodeKey = nodeKey
    this.flashLocatedNodeKey = nodeKey
    this.persistInternalState()
    this.render()

    if (this.flashTimerId !== null) {
      window.clearTimeout(this.flashTimerId)
    }
    this.flashTimerId = window.setTimeout(() => {
      this.flashTimerId = null
      this.flashLocatedNodeKey = null
      this.render()
    }, 1800)

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const selector = `[data-node-key="${escapeSelectorValue(nodeKey)}"]`
        const element = this.root.querySelector<HTMLElement>(selector)
        element?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        })
      })
    })
  }

  private persistInternalState(): void {
    this.settings.persistInternalState(this.currentGraphKey, {
      panelVisible: this.panelVisible,
      expandedKeys: [...this.expandedKeys],
      autoRefreshPaused: this.autoRefreshPaused,
      bodyScrollTop: this.bodyScrollTop,
      lastLocatedNodeKey: this.lastLocatedNodeKey,
      viewMode: this.viewMode,
      layout: this.layout.getPositions(),
    })
  }

  private applyMainUIState(): void {
    logseq.setMainUIAttrs({
      draggable: false,
      resizable: false,
    })

    const frame = this.layout.getFrame(this.viewMode, this.settings.getPanelWidth(), this.settings.getSidebarPosition())
    logseq.setMainUIInlineStyle({
      position: 'fixed',
      top: `${frame.y}px`,
      left: `${frame.x}px`,
      width: `${frame.width}px`,
      height: `${frame.height}px`,
      maxWidth: `${frame.width}px`,
      maxHeight: `${frame.height}px`,
      zIndex: 89,
      overflow: 'visible',
      borderRadius: this.viewMode === 'bubble' ? '999px' : '16px',
    })

    if (this.panelVisible) {
      logseq.showMainUI({ autoFocus: false })
      return
    }

    logseq.hideMainUI({ restoreEditingCursor: false })
  }

  private getBodyElement(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>('.favorite-tree__body')
  }

  private captureBodyScrollTop(): void {
    const body = this.getBodyElement()
    if (body) {
      this.bodyScrollTop = body.scrollTop
    }
  }

  private syncTheme(): void {
    applyTheme(this.currentThemeMode)
  }

  private readonly handleBodyScroll = (): void => {
    const body = this.getBodyElement()
    if (body) {
      this.bodyScrollTop = body.scrollTop
    }
  }

  private readonly handleWindowResize = (): void => {
    this.layout.ensureInViewport(this.settings.getPanelWidth(), this.settings.getSidebarPosition())
    this.applyMainUIState()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.layout.handlePointerMove(event, this.settings.getPanelWidth(), this.settings.getSidebarPosition())
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const result = this.layout.finishDrag(event, this.settings.getPanelWidth(), this.settings.getSidebarPosition())
    if (!result) {
      return
    }

    this.suppressBubbleClick = result.kind === 'bubble' && result.moved
    this.persistInternalState()
  }

  private async initializeGraphContext(): Promise<void> {
    this.currentGraphKey = await this.resolveCurrentGraphKey()
    this.restoreGraphState()
  }

  private restoreGraphState(): void {
    const restored = this.settings.readInternalState(this.currentGraphKey)
    this.panelVisible = restored.panelVisible
    this.autoRefreshPaused = restored.autoRefreshPaused
    this.bodyScrollTop = restored.bodyScrollTop
    this.lastLocatedNodeKey = restored.lastLocatedNodeKey
    this.viewMode = restored.viewMode
    this.searchQuery = ''
    this.searching = false
    this.currentPagePath = []
    this.flashLocatedNodeKey = null

    this.expandedKeys.clear()
    this.loadedKeys.clear()
    this.loadStates.clear()
    this.loadErrors.clear()

    this.layout.restore(restored.layout, this.settings.getSidebarPosition(), this.settings.getPanelWidth())
    for (const key of restored.expandedKeys) {
      this.expandedKeys.add(key)
      this.loadedKeys.add(key)
    }
  }

  private async handleGraphChanged(): Promise<void> {
    this.persistInternalState()
    this.currentGraphKey = await this.resolveCurrentGraphKey()
    this.restoreGraphState()
    this.treeService.invalidateIndex()
    this.layout.ensureInViewport(this.settings.getPanelWidth(), this.settings.getSidebarPosition())
    this.applyMainUIState()
    this.render()
    await this.refresh('graph-changed')
    await this.updateCurrentPage()
  }

  private async resolveCurrentGraphKey(): Promise<string> {
    try {
      const graph = await logseq.App.getCurrentGraph()
      if (!graph) {
        return 'default'
      }

      const path = typeof graph.path === 'string' ? graph.path.trim() : ''
      if (path) {
        return path
      }

      const url = typeof graph.url === 'string' ? graph.url.trim() : ''
      if (url) {
        return url
      }

      const name = typeof graph.name === 'string' ? graph.name.trim() : ''
      return name || 'default'
    } catch {
      return 'default'
    }
  }

  private async syncDerivedTreeState(): Promise<void> {
    const shouldBuildIndex = this.hasExpandedNodes() || Boolean(this.currentPageName) || Boolean(this.searchQuery)
    if (!shouldBuildIndex) {
      this.currentPagePath = []
      this.searching = false
      return
    }

    if (this.searchQuery) {
      this.searching = true
    }

    await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())
    this.syncExpandedLoadState()
    await this.syncCurrentPagePath()
    this.searching = false
  }

  private syncExpandedLoadState(): void {
    if (!this.hasExpandedNodes()) {
      return
    }

    for (const key of this.expandedKeys) {
      this.loadedKeys.add(key)
      this.loadStates.set(key, 'loaded')
      this.loadErrors.delete(key)
    }
  }

  private async syncCurrentPagePath(): Promise<void> {
    if (!this.currentPageName || !this.rootFavorites.length) {
      this.currentPagePath = []
      return
    }

    await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())
    this.currentPagePath = this.treeService.findPathToPage(this.rootFavorites, this.currentPageName) ?? []
  }

  private formatRefreshLabel(reason: string): string {
    const time = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const reasonMap: Record<string, string> = {
      startup: '启动初始化',
      'panel-open': '打开面板',
      'bubble-open': '显示悬浮球',
      'bubble-expand': '悬浮球展开',
      manual: '手动刷新',
      poll: '轮询刷新',
      'db-changed': '数据库变更',
      'graph-changed': '图谱切换',
      'settings-property': '设置变更',
    }

    return `${time} · ${reasonMap[reason] ?? '刷新'}`
  }
}

function normalizeCurrentPageTitle(current: object): string | null {
  const record = current as Record<string, unknown>
  const original = typeof record.originalName === 'string' ? record.originalName.trim() : ''
  if (original) {
    return original
  }

  const name = typeof record.name === 'string' ? record.name.trim() : ''
  return name || null
}
