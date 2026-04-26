import type { ThemeMode } from '@logseq/libs/dist/LSPlugin'
import { REFRESH_DEBOUNCE_MS, ROOT_SORT_KEY } from './constants'
import { FloatingLayoutManager } from './floating-layout'
import { createFavoriteTreeI18n, getFavoriteTreeI18n, type FavoriteTreeI18n } from './i18n'
import { renderFavoriteTree } from './render'
import { FavoriteTreeSettingsStore } from './settings'
import { FavoriteTreeTreeService } from './tree-service'
import type {
  DragKind,
  LoadState,
  PluginSettings,
  RefreshReason,
  SortDropTarget,
  SortOrderMap,
  SortableItem,
  TreeStateSnapshot,
  ViewMode,
} from './types'
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
  private controlsCollapsed = false
  private sortOrders: SortOrderMap = {}
  private bodyScrollTop = 0
  private lastLocatedNodeKey: string | null = null
  private flashLocatedNodeKey: string | null = null
  private suppressBubbleClick = false
  private sortDragItem: SortableItem | null = null
  private readonly expandedKeys = new Set<string>()
  private readonly loadedKeys = new Set<string>()
  private readonly loadStates = new Map<string, LoadState>()
  private readonly loadErrors = new Map<string, string>()
  private refreshTimerId: number | null = null
  private routeTimerId: number | null = null
  private pollTimerId: number | null = null
  private flashTimerId: number | null = null
  private lastRefreshAt: number | null = null
  private lastRefreshReason: RefreshReason | null = null
  private lastRefreshError: string | null = null
  private offHooks: Array<() => void> = []
  private i18n: FavoriteTreeI18n

  private readonly settings = new FavoriteTreeSettingsStore()
  private readonly treeService = new FavoriteTreeTreeService()
  private readonly layout = new FloatingLayoutManager(() => {
    this.applyMainUIState()
  })

  constructor(private readonly root: HTMLElement, initialI18n: FavoriteTreeI18n = createFavoriteTreeI18n('en')) {
    this.i18n = initialI18n
  }

  async init(): Promise<void> {
    await this.initializeGraphContext()
    await this.syncLocale()

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
    this.layout.ensureInViewport(this.settings.getSidebarPosition())
    this.persistInternalState()
    this.applyMainUIState()

    if (this.panelVisible) {
      await this.syncLocale()
    }
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
    this.layout.ensureInViewport(this.settings.getSidebarPosition())
    this.persistInternalState()
    this.applyMainUIState()
    this.render()
  }

  expandFromBubble = async (): Promise<void> => {
    this.panelVisible = true
    this.viewMode = 'panel'
    this.layout.ensureInViewport(this.settings.getSidebarPosition())
    this.persistInternalState()
    this.applyMainUIState()
    await this.syncLocale()
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

  resetPanelSize = (): void => {
    this.layout.resetPanelSize(this.settings.getPanelWidth(), this.settings.getSidebarPosition())
    this.persistInternalState()
  }

  toggleControlsCollapsed = (): void => {
    this.controlsCollapsed = !this.controlsCollapsed
    this.persistInternalState()
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
      logseq.UI.showMsg(this.i18n.t('locateNoCurrentPage'), 'warning')
      return
    }

    await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())
    const paths = this.treeService.findPathsToPage(this.rootFavorites, this.currentPageName)
    if (!paths.length) {
      logseq.UI.showMsg(this.i18n.t('locatePageNotInTree'), 'warning')
      return
    }

    for (const path of paths) {
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
      this.loadErrors.set(nodeKey, error instanceof Error ? error.message : this.i18n.t('loadChildrenFailed'))
    }

    this.render()
  }

  openPage = (pageName: string): void => {
    logseq.App.pushState('page', { name: pageName })
  }

  startSortDrag = (item: SortableItem): void => {
    if (this.searchQuery) {
      return
    }
    this.sortDragItem = item
  }

  moveSortDropTarget = (target: SortDropTarget): boolean => {
    if (!this.sortDragItem || this.searchQuery) {
      return false
    }
    if (target.parentKey !== this.sortDragItem.parentKey) {
      return false
    }
    return target.itemId !== this.sortDragItem.itemId
  }

  finishSortDrop = (target: SortDropTarget): boolean => {
    if (!this.sortDragItem || this.searchQuery) {
      this.clearSortDrag()
      return false
    }
    if (target.parentKey !== this.sortDragItem.parentKey || target.itemId === this.sortDragItem.itemId) {
      this.clearSortDrag()
      return false
    }

    const siblings = this.getOrderedTitlesForParent(target.parentKey)
    const nextOrder = this.moveTitleWithinSiblings(
      siblings,
      this.sortDragItem.title,
      target.title,
      target.placement,
    )

    this.applyCustomSortOrderForParent(target.parentKey, nextOrder)
    this.persistInternalState()
    this.render()
    this.clearSortDrag()
    return true
  }

  endSortDrag = (): void => {
    this.clearSortDrag()
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
          this.layout.ensureInViewport(this.settings.getSidebarPosition())
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

  private scheduleRefresh(reason: RefreshReason): void {
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId)
    }

    this.refreshTimerId = window.setTimeout(() => {
      void this.refresh(reason)
    }, REFRESH_DEBOUNCE_MS)
  }

  private async refresh(reason: RefreshReason): Promise<void> {
    if (this.refreshing) {
      return
    }

    await this.syncLocale()
    this.refreshing = true
    this.render()

    try {
      this.rootFavorites = this.applySortOrder(await this.treeService.loadFavoriteRoots(), ROOT_SORT_KEY)
      this.treeService.invalidateIndex()
      await this.syncDerivedTreeState()

      this.lastRefreshAt = Date.now()
      this.lastRefreshReason = reason
      this.lastRefreshError = null
    } catch (error) {
      const message = error instanceof Error ? error.message : this.i18n.t('refreshReasonDefault')
      this.lastRefreshAt = Date.now()
      this.lastRefreshReason = reason
      this.lastRefreshError = message
      logseq.UI.showMsg(this.i18n.t('refreshToastFailed', { message }), 'warning')
    } finally {
      this.refreshing = false
      this.render()
    }
  }

  private async updateCurrentPage(): Promise<void> {
    const current = await logseq.Editor.getCurrentPage()
    this.currentPageName = current && typeof current === 'object' ? normalizeCurrentPageTitle(current) : null
    const currentPageKey = normalizeTitle(this.currentPageName)
    if (this.lastLocatedNodeKey && this.lastLocatedNodeKey !== currentPageKey) {
      this.lastLocatedNodeKey = null
      this.persistInternalState()
    }
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

    this.root.innerHTML = renderFavoriteTree(
      this.getRenderState(),
      {
        getChildrenFor: (title) => this.getOrderedChildrenFor(title),
      },
      this.i18n,
    )

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
      lastRefreshLabel: this.getLastRefreshLabel(),
      viewMode: this.viewMode,
      controlsCollapsed: this.controlsCollapsed,
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
      controlsCollapsed: this.controlsCollapsed,
      sortOrders: this.sortOrders,
      layout: this.layout.getPositions(),
      panelSize: this.layout.getPanelSize(),
    })
  }

  private applyMainUIState(): void {
    logseq.setMainUIAttrs({
      draggable: false,
      resizable: false,
    })

    const frame = this.layout.getFrame(this.viewMode, this.settings.getSidebarPosition())
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
    this.layout.ensureInViewport(this.settings.getSidebarPosition())
    this.applyMainUIState()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.layout.handlePointerMove(event, this.settings.getSidebarPosition())
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const result = this.layout.finishDrag(event, this.settings.getSidebarPosition())
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
    this.controlsCollapsed = restored.controlsCollapsed
    this.sortOrders = restored.sortOrders
    this.searchQuery = ''
    this.searching = false
    this.currentPagePath = []
    this.flashLocatedNodeKey = null
    this.sortDragItem = null

    this.expandedKeys.clear()
    this.loadedKeys.clear()
    this.loadStates.clear()
    this.loadErrors.clear()

    this.layout.restore(restored.layout, restored.panelSize, this.settings.getSidebarPosition(), this.settings.getPanelWidth())
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
    this.layout.ensureInViewport(this.settings.getSidebarPosition())
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

  private getOrderedChildrenFor(parentTitle: string): string[] {
    return this.applySortOrder(this.treeService.getChildrenFor(parentTitle), normalizeTitle(parentTitle))
  }

  private getOrderedTitlesForParent(parentKey: string): string[] {
    return parentKey === ROOT_SORT_KEY ? [...this.rootFavorites] : this.getOrderedChildrenFor(parentKey)
  }

  private applySortOrder(titles: string[], parentKey: string): string[] {
    const key = parentKey.trim()
    if (!key) {
      return [...titles]
    }

    const customOrder = this.sortOrders[key]
    if (!customOrder?.length) {
      return [...titles]
    }

    const remaining = [...titles]
    const ordered: string[] = []
    for (const title of customOrder) {
      const index = remaining.indexOf(title)
      if (index >= 0) {
        ordered.push(title)
        remaining.splice(index, 1)
      }
    }
    return [...ordered, ...remaining]
  }

  private applyCustomSortOrderForParent(parentKey: string, titles: string[]): void {
    const key = parentKey.trim()
    if (!key) {
      return
    }

    this.sortOrders = {
      ...this.sortOrders,
      [key]: [...titles],
    }

    if (key === ROOT_SORT_KEY) {
      this.rootFavorites = [...titles]
    }
  }

  private moveTitleWithinSiblings(
    siblings: string[],
    sourceTitle: string,
    targetTitle: string,
    placement: 'before' | 'after',
  ): string[] {
    const next = [...siblings]
    const sourceIndex = next.indexOf(sourceTitle)
    const targetIndex = next.indexOf(targetTitle)
    if (sourceIndex < 0 || targetIndex < 0) {
      return next
    }

    const [moved] = next.splice(sourceIndex, 1)
    const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
    const insertIndex = placement === 'after' ? adjustedTargetIndex + 1 : adjustedTargetIndex
    next.splice(insertIndex, 0, moved)
    return next
  }

  private clearSortDrag(): void {
    this.sortDragItem = null
  }

  private getLastRefreshLabel(): string {
    if (this.lastRefreshError) {
      return this.i18n.t('refreshFailed', { message: this.lastRefreshError })
    }
    if (this.lastRefreshAt !== null) {
      const time = this.i18n.formatClock(new Date(this.lastRefreshAt))
      return `${time} · ${this.translateRefreshReason(this.lastRefreshReason)}`
    }
    return this.i18n.t('notRefreshedYet')
  }

  private translateRefreshReason(reason: RefreshReason | null): string {
    const reasonMap: Record<RefreshReason, string> = {
      startup: this.i18n.t('refreshReasonStartup'),
      'panel-open': this.i18n.t('refreshReasonPanelOpen'),
      'bubble-open': this.i18n.t('refreshReasonBubbleOpen'),
      'bubble-expand': this.i18n.t('refreshReasonBubbleExpand'),
      manual: this.i18n.t('refreshReasonManual'),
      poll: this.i18n.t('refreshReasonPoll'),
      'db-changed': this.i18n.t('refreshReasonDbChanged'),
      'graph-changed': this.i18n.t('refreshReasonGraphChanged'),
      'settings-property': this.i18n.t('refreshReasonSettingsProperty'),
    }

    return reason ? reasonMap[reason] : this.i18n.t('refreshReasonDefault')
  }

  private async syncLocale(): Promise<void> {
    this.i18n = await getFavoriteTreeI18n()
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
