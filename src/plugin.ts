import type { ThemeMode } from '@logseq/libs/dist/LSPlugin'
import { REFRESH_DEBOUNCE_MS, ROOT_SORT_KEY } from './constants'
import { FloatingLayoutManager } from './floating-layout'
import { createFavoriteTreeI18n, getFavoriteTreeI18n, type FavoriteTreeI18n } from './i18n'
import { renderFavoriteTree } from './render'
import { renderSidebarTree, SIDEBAR_TREE_HOST_STYLE } from './sidebar-render'
import { FavoriteTreeSettingsStore } from './settings'
import { FavoriteTreeTreeService } from './tree-service'
import type {
  DisplayMode,
  DisplayModePreference,
  DragKind,
  LoadState,
  PluginSettings,
  RefreshReason,
  SortDropTarget,
  SortFeedbackState,
  SortMode,
  SortModeMap,
  SortOrderMap,
  SortableItem,
  TreeStateSnapshot,
  ViewMode,
} from './types'
import { applyTheme } from './theme'
import { escapeSelectorValue, normalizeTitle } from './utils'

export class FavoriteTreePlugin {
  private static readonly SIDEBAR_TREE_UI_KEY = 'db-favorite-tree-left-sidebar'
  private static readonly SIDEBAR_TREE_STYLE_KEY = 'db-favorite-tree-left-sidebar-style'
  private static readonly SIDEBAR_TREE_PATHS = [
    '.left-sidebar-inner .favorites',
    '.left-sidebar-inner .nav-content-item[data-ref="favorites"]',
    '.left-sidebar-inner',
  ] as const

  private currentGraphKey = 'default'
  private displayMode: DisplayMode = 'sidebar'
  private displayModePreference: DisplayModePreference = 'sidebar'
  private panelVisible = false
  private viewMode: ViewMode = 'panel'
  private refreshing = false
  private searching = false
  private searchQuery = ''
  private currentPageName: string | null = null
  private currentPagePath: string[] = []
  private currentThemeMode: ThemeMode = 'light'
  private rootFavorites: string[] = []
  private autoRefreshPaused = true
  private controlsCollapsed = false
  private sortOrders: SortOrderMap = {}
  private sortModes: SortModeMap = {}
  private bodyScrollTop = 0
  private lastLocatedNodeKey: string | null = null
  private flashLocatedNodeKey: string | null = null
  private suppressBubbleClick = false
  private sortDragItem: SortableItem | null = null
  private sortFeedback: SortFeedbackState | null = null
  private readonly expandedKeys = new Set<string>()
  private readonly searchCollapsedKeys = new Set<string>()
  private readonly loadedKeys = new Set<string>()
  private readonly loadStates = new Map<string, LoadState>()
  private readonly loadErrors = new Map<string, string>()
  private refreshTimerId: number | null = null
  private routeTimerId: number | null = null
  private pollTimerId: number | null = null
  private flashTimerId: number | null = null
  private localeWatchTimerId: number | null = null
  private sidebarRenderVersion = 0
  private sidebarTreePath: string | null = null
  private sidebarTreeTemplate = ''
  private lastRefreshAt: number | null = null
  private lastRefreshReason: RefreshReason | null = null
  private lastRefreshError: string | null = null
  private destroyed = false
  private offHooks: Array<() => void> = []
  private i18n: FavoriteTreeI18n

  private readonly settings = new FavoriteTreeSettingsStore()
  private readonly treeService = new FavoriteTreeTreeService()
  private readonly layout = new FloatingLayoutManager(() => {
    this.applyMainUIState()
  })

  constructor(private readonly root: HTMLElement, initialI18n: FavoriteTreeI18n = createFavoriteTreeI18n('en')) {
    this.i18n = initialI18n
    this.registerInjectedModels()
  }

  async init(): Promise<void> {
    await this.initializeGraphContext()
    await this.syncLocale()
    const hostDocument = this.getHostDocument()

    window.addEventListener('pointermove', this.handlePointerMove)
    window.addEventListener('pointerup', this.handlePointerUp)
    window.addEventListener('pointercancel', this.handlePointerUp)
    window.addEventListener('resize', this.handleWindowResize)
    window.addEventListener('focus', this.handleWindowFocus)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    hostDocument.addEventListener('input', this.handleSidebarSearchInput)
    logseq.provideStyle({
      key: FavoriteTreePlugin.SIDEBAR_TREE_STYLE_KEY,
      style: SIDEBAR_TREE_HOST_STYLE,
    })

    this.render()
    this.applyMainUIState()
    this.syncTheme()
    await this.refresh('startup')
    await this.updateCurrentPage()
    this.registerHooks()
    this.startPolling()
    this.startLocaleWatcher()

    if (this.panelVisible && this.displayMode === 'floating') {
      logseq.showMainUI({ autoFocus: false })
    }
  }

  destroy(): void {
    this.destroyed = true
    this.sidebarRenderVersion += 1
    this.persistInternalState()
    this.layout.destroy()
    const hostDocument = this.getHostDocument()
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
    if (this.localeWatchTimerId !== null) {
      window.clearInterval(this.localeWatchTimerId)
    }
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('pointerup', this.handlePointerUp)
    window.removeEventListener('pointercancel', this.handlePointerUp)
    window.removeEventListener('resize', this.handleWindowResize)
    window.removeEventListener('focus', this.handleWindowFocus)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    hostDocument.removeEventListener('input', this.handleSidebarSearchInput)
    for (const off of this.offHooks) {
      off()
    }
  }

  togglePanel = async (): Promise<void> => {
    if (this.displayMode === 'sidebar' && !this.canSwitchDisplayMode()) {
      this.render()
      await this.refresh('panel-open')
      await this.updateCurrentPage()
      return
    }

    if (this.displayMode === 'sidebar') {
      await this.switchToFloatingMode('panel')
      return
    }

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
    if (this.displayMode === 'sidebar' && !this.canSwitchDisplayMode()) {
      return
    }

    if (this.displayMode === 'sidebar') {
      this.displayMode = 'floating'
      this.panelVisible = false
      this.viewMode = 'panel'
      this.persistInternalState()
      this.applyMainUIState()
      this.render()
      return
    }

    if (!this.panelVisible) {
      return
    }

    this.panelVisible = false
    this.persistInternalState()
    this.applyMainUIState()
    this.render()
  }

  collapseToBubble = async (): Promise<void> => {
    if (this.displayMode === 'sidebar' && !this.canSwitchDisplayMode()) {
      return
    }

    if (this.displayMode === 'sidebar') {
      await this.switchToFloatingMode('bubble')
      return
    }

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
    if (this.displayMode === 'sidebar') {
      await this.switchToFloatingMode('panel')
      return
    }

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

  switchDisplayMode = async (): Promise<void> => {
    if (!this.canSwitchDisplayMode()) {
      return
    }

    if (this.displayMode === 'sidebar') {
      await this.switchToFloatingMode('panel')
      return
    }

    this.displayMode = 'sidebar'
    this.panelVisible = false
    this.viewMode = 'panel'
    this.persistInternalState()
    this.applyMainUIState()
    this.render()
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
    if (nextQuery !== this.searchQuery) {
      this.searchCollapsedKeys.clear()
    }
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
    if (this.searchQuery) {
      const visibleExpandableKeys = this.collectVisibleExpandableKeys()
      if (visibleExpandableKeys.size === 0) {
        return
      }

      if (this.searchCollapsedKeys.size > 0) {
        this.searchCollapsedKeys.clear()
      } else {
        this.searchCollapsedKeys.clear()
        for (const key of visibleExpandableKeys) {
          this.searchCollapsedKeys.add(key)
        }
      }
      this.render()
      return
    }

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
    if (this.searchQuery) {
      if (this.searchCollapsedKeys.has(nodeKey)) {
        this.searchCollapsedKeys.delete(nodeKey)
      } else {
        this.searchCollapsedKeys.add(nodeKey)
      }
      this.render()
      return
    }

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
      if (this.treeService.getChildrenFor(nodeKey).length === 0) {
        this.expandedKeys.delete(nodeKey)
        this.persistInternalState()
      }
    } catch (error) {
      this.loadStates.set(nodeKey, 'error')
      this.loadErrors.set(nodeKey, error instanceof Error ? error.message : this.i18n.t('loadChildrenFailed'))
    }

    this.render()
  }

  openPage = (pageName: string): void => {
    logseq.App.pushState('page', { name: pageName })
  }

  toggleSortModeForParent = (parentKey: string): void => {
    const key = this.normalizeSortParentKey(parentKey)
    if (!key || !this.hasCustomSortOrder(key)) {
      return
    }

    const nextMode: SortMode = this.getSortModeForParent(key) === 'custom' ? 'default' : 'custom'
    this.sortModes = {
      ...this.sortModes,
      [key]: nextMode,
    }
    this.persistInternalState()
    this.render()
  }

  clearCustomSortForParent = (parentKey: string): void => {
    const key = this.normalizeSortParentKey(parentKey)
    if (!key || !this.hasCustomSortOrder(key)) {
      return
    }

    const confirmed = window.confirm(this.i18n.t('clearCustomSortConfirm'))
    if (!confirmed) {
      return
    }

    const { [key]: _removedOrder, ...remainingOrders } = this.sortOrders
    const { [key]: _removedMode, ...remainingModes } = this.sortModes
    this.sortOrders = remainingOrders
    this.sortModes = remainingModes
    this.persistInternalState()
    this.render()
  }

  startSortDrag = (item: SortableItem): void => {
    if (this.searchQuery) {
      return
    }
    this.sortDragItem = item
    this.sortFeedback = {
      itemId: item.itemId,
      parentKey: item.parentKey,
      targetItemId: null,
      targetParentKey: null,
      placement: null,
      kind: 'idle',
    }
    this.render()
  }

  moveSortDropTarget = (target: SortDropTarget): boolean => {
    if (!this.sortDragItem || this.searchQuery) {
      this.sortFeedback = null
      return false
    }

    if (target.parentKey !== this.sortDragItem.parentKey) {
      this.sortFeedback = {
        itemId: this.sortDragItem.itemId,
        parentKey: this.sortDragItem.parentKey,
        targetItemId: target.itemId,
        targetParentKey: target.parentKey,
        placement: target.placement,
        kind: 'invalid-level',
      }
      this.render()
      return false
    }

    if (target.itemId === this.sortDragItem.itemId) {
      this.sortFeedback = {
        itemId: this.sortDragItem.itemId,
        parentKey: this.sortDragItem.parentKey,
        targetItemId: target.itemId,
        targetParentKey: target.parentKey,
        placement: target.placement,
        kind: 'invalid-self',
      }
      this.render()
      return false
    }

    this.sortFeedback = {
      itemId: this.sortDragItem.itemId,
      parentKey: this.sortDragItem.parentKey,
      targetItemId: target.itemId,
      targetParentKey: target.parentKey,
      placement: target.placement,
      kind: target.placement === 'after' ? 'after' : 'before',
    }
    this.render()
    return true
  }

  clearSortDropTarget = (): void => {
    if (!this.sortDragItem) {
      return
    }

    this.sortFeedback = {
      itemId: this.sortDragItem.itemId,
      parentKey: this.sortDragItem.parentKey,
      targetItemId: null,
      targetParentKey: null,
      placement: null,
      kind: 'idle',
    }
    this.render()
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
        void this.renderSidebarTreeUI()
      }),
    )

    this.offHooks.push(
      logseq.App.onCurrentGraphChanged(() => {
        void this.handleGraphChanged()
      }),
    )

    this.offHooks.push(
      logseq.App.onSidebarVisibleChanged(({ visible }) => {
        if (visible) {
          void this.renderSidebarTreeUI()
        } else {
          this.clearSidebarTreeUI()
        }
      }),
    )

    this.offHooks.push(
      logseq.onSettingsChanged<PluginSettings>((newSettings, oldSettings) => {
        const propertyChanged = newSettings.hierarchyProperty !== oldSettings?.hierarchyProperty
        const widthChanged = newSettings.panelWidth !== oldSettings?.panelWidth
        const pollIntervalChanged = newSettings.pollIntervalSeconds !== oldSettings?.pollIntervalSeconds
        const positionChanged = newSettings.sidebarPosition !== oldSettings?.sidebarPosition
        const displayModePreferenceChanged = newSettings.displayModePreference !== oldSettings?.displayModePreference

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

        if (displayModePreferenceChanged) {
          this.applyDisplayModePreference()
          this.persistInternalState()
          this.applyMainUIState()
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

  private startLocaleWatcher(): void {
    if (this.localeWatchTimerId !== null) {
      window.clearInterval(this.localeWatchTimerId)
    }

    this.localeWatchTimerId = window.setInterval(() => {
      void this.refreshLocaleIfNeeded()
    }, 1500)
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
      this.rootFavorites = await this.treeService.loadFavoriteRoots()
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
    void this.renderSidebarTreeUI()

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
      rootFavorites: this.getOrderedTitlesForParent(ROOT_SORT_KEY),
      sortOrders: this.sortOrders,
      sortModes: this.sortModes,
      sortDragItem: this.sortDragItem,
      sortFeedback: this.sortFeedback,
      expandedKeys: this.expandedKeys,
      searchCollapsedKeys: this.searchCollapsedKeys,
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
      displayMode: this.displayMode,
      canSwitchDisplayMode: this.canSwitchDisplayMode(),
      controlsCollapsed: this.controlsCollapsed,
      rootSortHasCustomOrder: this.hasCustomSortOrder(ROOT_SORT_KEY),
      rootSortMode: this.getSortModeForParent(ROOT_SORT_KEY),
    }
  }

  private async switchToFloatingMode(nextViewMode: ViewMode): Promise<void> {
    if (this.displayModePreference === 'sidebar') {
      return
    }

    this.displayMode = 'floating'
    this.viewMode = nextViewMode
    this.panelVisible = true
    this.layout.ensureInViewport(this.settings.getSidebarPosition())
    this.persistInternalState()
    this.applyMainUIState()
    await this.syncLocale()
    this.render()
  }

  private hasExpandedNodes(): boolean {
    return this.expandedKeys.size > 0
  }

  private canSwitchDisplayMode(): boolean {
    return this.displayModePreference === 'mixed'
  }

  private collectVisibleExpandableKeys(): Set<string> {
    const normalizedQuery = normalizeTitle(this.searchQuery)
    const keys = new Set<string>()
    if (!normalizedQuery) {
      return keys
    }

    for (const title of this.rootFavorites) {
      this.collectVisibleExpandableKeysForNode(title, normalizedQuery, [], keys)
    }

    return keys
  }

  private collectVisibleExpandableKeysForNode(
    title: string,
    normalizedQuery: string,
    ancestors: string[],
    keys: Set<string>,
  ): boolean {
    const key = normalizeTitle(title)
    if (!key || ancestors.includes(key)) {
      return false
    }

    const children = this.getOrderedChildrenFor(title)
    const nextAncestors = [...ancestors, key]
    const visibleChildren = children.filter((childTitle) =>
      this.collectVisibleExpandableKeysForNode(childTitle, normalizedQuery, nextAncestors, keys),
    )

    const selfMatches = key.includes(normalizedQuery)
    if (visibleChildren.length > 0) {
      keys.add(key)
    }

    return selfMatches || visibleChildren.length > 0
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
      displayMode: this.displayMode,
      bodyScrollTop: this.bodyScrollTop,
      lastLocatedNodeKey: this.lastLocatedNodeKey,
      viewMode: this.viewMode,
      controlsCollapsed: this.controlsCollapsed,
      sortOrders: this.sortOrders,
      sortModes: this.sortModes,
      layout: this.layout.getPositions(),
      panelSize: this.layout.getPanelSize(),
    })
  }

  private applyMainUIState(): void {
    if (this.displayMode === 'sidebar') {
      logseq.hideMainUI({ restoreEditingCursor: false })
      return
    }

    this.clearSidebarTreeUI()

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

  private registerInjectedModels(): void {
    logseq.provideModel({
      sidebarTreeToggle: (event: { dataset?: Record<string, string> }) => {
        const key = event.dataset?.key
        if (key) {
          void this.onNodeToggle(key)
        }
      },
      sidebarTreeOpenPage: (event: { dataset?: Record<string, string> }) => {
        const page = event.dataset?.page
        if (page) {
          this.openPage(page)
        }
      },
      sidebarTreeToggleSortMode: (event: { dataset?: Record<string, string> }) => {
        const parentKey = event.dataset?.parentKey
        if (parentKey) {
          this.toggleSortModeForParent(parentKey)
        }
      },
      sidebarTreeClearCustomSort: (event: { dataset?: Record<string, string> }) => {
        const parentKey = event.dataset?.parentKey
        if (parentKey) {
          this.clearCustomSortForParent(parentKey)
        }
      },
      sidebarTreeShowFloating: () => {
        void this.switchToFloatingMode('panel')
      },
      sidebarTreeToggleControls: () => {
        this.toggleControlsCollapsed()
      },
      sidebarTreeRefresh: () => {
        void this.manualRefresh()
      },
      sidebarTreeCollapseToBubble: () => {
        void this.collapseToBubble()
      },
      sidebarTreeOpenSettings: () => {
        this.openSettings()
      },
      sidebarTreeClose: () => {
        this.closePanel()
      },
      sidebarTreeLocateCurrent: () => {
        void this.locateCurrentPage()
      },
      sidebarTreeResetPanelSize: () => {
        this.resetPanelSize()
      },
      sidebarTreeToggleExpandAll: () => {
        void this.toggleExpandCollapseAll()
      },
      sidebarTreeToggleAutoRefresh: () => {
        this.toggleAutoRefresh()
      },
    })
  }

  private async renderSidebarTreeUI(): Promise<void> {
    if (this.destroyed) {
      return
    }

    if (this.displayMode !== 'sidebar') {
      this.clearSidebarTreeUI()
      return
    }

    const renderVersion = ++this.sidebarRenderVersion
    const hostDocument = this.getHostDocument()
    const activeElement = hostDocument.activeElement
    const activeSidebarSearch = this.asSidebarSearchInput(activeElement)
    const shouldRestoreSidebarSearchFocus = activeSidebarSearch !== null
    const selectionStart = activeSidebarSearch?.selectionStart ?? this.searchQuery.length
    const selectionEnd = activeSidebarSearch?.selectionEnd ?? this.searchQuery.length
    const path = await this.resolveSidebarTreePath()
    if (!path || renderVersion !== this.sidebarRenderVersion || this.destroyed) {
      return
    }

    const template = renderSidebarTree(
      this.getRenderState(),
      {
        getChildrenFor: (title) => this.getOrderedChildrenFor(title),
      },
      this.i18n,
    )

    if (this.sidebarTreePath && this.sidebarTreePath !== path) {
      this.clearSidebarTreeUI(this.sidebarTreePath)
    }

    if (this.sidebarTreePath === path && this.sidebarTreeTemplate === template) {
      return
    }

    logseq.provideUI({
      key: FavoriteTreePlugin.SIDEBAR_TREE_UI_KEY,
      path,
      reset: true,
      template,
    })
    this.sidebarTreePath = path
    this.sidebarTreeTemplate = template

    if (shouldRestoreSidebarSearchFocus) {
      window.requestAnimationFrame(() => {
        const nextInput = this.asSidebarSearchInput(
          hostDocument.querySelector('[data-favorite-sidebar-tree="true"] [data-role="sidebar-search-input"]'),
        )
        if (nextInput) {
          nextInput.focus({ preventScroll: true })
          nextInput.setSelectionRange(selectionStart, selectionEnd)
        }
      })
    }
  }

  private clearSidebarTreeUI(targetPath?: string): void {
    const paths = targetPath ? [targetPath] : this.sidebarTreePath ? [this.sidebarTreePath] : []
    this.sidebarRenderVersion += 1
    this.sidebarTreePath = null
    this.sidebarTreeTemplate = ''

    for (const path of paths) {
      if (!this.hasSidebarTarget(path)) {
        continue
      }

      logseq.provideUI({
        key: FavoriteTreePlugin.SIDEBAR_TREE_UI_KEY,
        path,
        reset: true,
        template: '',
      })
    }
  }

  private async resolveSidebarTreePath(): Promise<string | null> {
    for (const path of FavoriteTreePlugin.SIDEBAR_TREE_PATHS) {
      if (!this.hasSidebarTarget(path)) {
        continue
      }

      const rect = await logseq.UI.queryElementRect(path)
      if (rect) {
        return path
      }
    }

    return null
  }

  private hasSidebarTarget(path: string): boolean {
    try {
      return Boolean(this.getHostDocument().querySelector(path))
    } catch {
      return false
    }
  }

  private getHostDocument(): Document {
    try {
      if (window.top?.document) {
        return window.top.document
      }
    } catch {
      // Ignore cross-frame access failures and fall back to the plugin iframe document.
    }

    return document
  }

  private asSidebarSearchInput(target: EventTarget | null): HTMLInputElement | null {
    if (!target || typeof target !== 'object') {
      return null
    }

    const candidate = target as Partial<HTMLInputElement> & {
      getAttribute?: (name: string) => string | null
      tagName?: string
    }

    if (candidate.getAttribute?.('data-role') !== 'sidebar-search-input') {
      return null
    }

    if (typeof candidate.tagName !== 'string' || candidate.tagName.toUpperCase() !== 'INPUT') {
      return null
    }

    return target as HTMLInputElement
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

  private readonly handleWindowFocus = (): void => {
    void this.refreshLocaleIfNeeded()
  }

  private readonly handleSidebarSearchInput = (event: Event): void => {
    const target = this.asSidebarSearchInput(event.target)
    if (!target) {
      return
    }

    void this.setSearchQuery(target.value)
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.refreshLocaleIfNeeded()
    }
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
    this.displayModePreference = this.settings.getDisplayModePreference()
    this.displayMode = restored.displayMode
    this.panelVisible = restored.panelVisible
    this.autoRefreshPaused = restored.autoRefreshPaused
    this.bodyScrollTop = restored.bodyScrollTop
    this.lastLocatedNodeKey = restored.lastLocatedNodeKey
    this.viewMode = restored.viewMode
    this.controlsCollapsed = restored.controlsCollapsed
    this.sortOrders = restored.sortOrders
    this.sortModes = restored.sortModes
    this.searchQuery = ''
    this.searching = false
    this.currentPagePath = []
    this.flashLocatedNodeKey = null
    this.sortDragItem = null
    this.sortFeedback = null

    this.expandedKeys.clear()
    this.loadedKeys.clear()
    this.loadStates.clear()
    this.loadErrors.clear()

    this.layout.restore(restored.layout, restored.panelSize, this.settings.getSidebarPosition(), this.settings.getPanelWidth())
    for (const key of restored.expandedKeys) {
      this.expandedKeys.add(key)
      this.loadedKeys.add(key)
    }
    this.applyDisplayModePreference(true)
  }

  private applyDisplayModePreference(preferSidebarInMixed = false): void {
    this.displayModePreference = this.settings.getDisplayModePreference()

    if (this.displayModePreference === 'sidebar') {
      this.displayMode = 'sidebar'
      this.viewMode = 'panel'
      this.panelVisible = false
      return
    }

    if (this.displayModePreference === 'floating') {
      this.displayMode = 'floating'
      this.viewMode = this.viewMode === 'bubble' ? 'bubble' : 'panel'
      this.panelVisible = true
      return
    }

    if (this.displayMode !== 'sidebar' && this.displayMode !== 'floating') {
      this.displayMode = 'sidebar'
    }

    if (preferSidebarInMixed) {
      this.displayMode = 'sidebar'
      this.panelVisible = false
      return
    }

    if (this.displayMode === 'sidebar') {
      this.panelVisible = false
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
    const shouldBuildIndex =
      this.rootFavorites.length > 0 || this.hasExpandedNodes() || Boolean(this.currentPageName) || Boolean(this.searchQuery)
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
    return parentKey === ROOT_SORT_KEY ? this.applySortOrder(this.rootFavorites, ROOT_SORT_KEY) : this.getOrderedChildrenFor(parentKey)
  }

  private applySortOrder(titles: string[], parentKey: string): string[] {
    const key = this.normalizeSortParentKey(parentKey)
    if (!key) {
      return [...titles]
    }

    const customOrder = this.sortOrders[key]
    if (!customOrder?.length || this.getSortModeForParent(key) !== 'custom') {
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
    const key = this.normalizeSortParentKey(parentKey)
    if (!key) {
      return
    }

    this.sortOrders = {
      ...this.sortOrders,
      [key]: [...titles],
    }
    this.sortModes = {
      ...this.sortModes,
      [key]: 'custom',
    }
  }

  private normalizeSortParentKey(parentKey: string): string {
    const trimmed = parentKey.trim()
    return trimmed || ''
  }

  private hasCustomSortOrder(parentKey: string): boolean {
    const key = this.normalizeSortParentKey(parentKey)
    return Boolean(key && this.sortOrders[key]?.length)
  }

  private getSortModeForParent(parentKey: string): SortMode {
    const key = this.normalizeSortParentKey(parentKey)
    if (!key || !this.hasCustomSortOrder(key)) {
      return 'default'
    }
    return this.sortModes[key] === 'default' ? 'default' : 'custom'
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
    this.sortFeedback = null
    this.render()
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

  private async refreshLocaleIfNeeded(): Promise<void> {
    const nextI18n = await getFavoriteTreeI18n()
    if (nextI18n.language === this.i18n.language) {
      return
    }

    this.i18n = nextI18n
    this.render()
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
