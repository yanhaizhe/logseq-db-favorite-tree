import type { ThemeMode } from '@logseq/libs/dist/LSPlugin'
import { REFRESH_DEBOUNCE_MS, ROOT_SORT_KEY } from './constants'
import { shouldRefreshOnDbChange } from './db-change'
import { FloatingLayoutManager } from './floating-layout'
import { createFavoriteTreeI18n, getFavoriteTreeI18n, type FavoriteTreeI18n } from './i18n'
import { renderFavoriteTree } from './render'
import { renderSidebarTree } from './sidebar-render'
import { FavoriteTreeSettingsStore } from './settings'
import { FavoriteTreeTreeService } from './tree-service'
import type {
  DisplayMode,
  DisplayModePreference,
  DragKind,
  LoadState,
  ContextMenuState,
  PageEntity,
  PageLookup,
  PluginSettings,
  RefreshReason,
  SortDropTarget,
  SortMode,
  SortModeMap,
  SortOrderMap,
  SortableItem,
  TreeStateSnapshot,
  ViewMode,
} from './types'
import {
  applyTheme,
} from './theme'
import {
  copyTextToClipboard,
  escapeSelectorValue,
  extractErrorMessage,
  findPropertyValue,
  isPageDeletedLike,
  normalizeTitle,
  pageTitle,
  unwrapPageRef,
} from './utils'

export class FavoriteTreePlugin {
  private static readonly SIDEBAR_TREE_UI_KEY = 'db-favorite-tree-left-sidebar'
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
  private pendingRefreshReason: RefreshReason | null = null
  private searching = false
  private searchQuery = ''
  private searchError: string | null = null
  private contextMenu: ContextMenuState | null = null
  private lastPointerPos: { x: number; y: number; time: number } | null = null
  private createChildDraftParent: string | null = null
  private createChildDraftTitle = ''
  private shouldFocusCreateChildInput = false
  private activeSearchMatchKey: string | null = null
  private searchMatchKeys: string[] = []
  private currentPageName: string | null = null
  private currentPagePath: string[] = []
  private currentThemeMode: ThemeMode = 'light'
  private rootFavorites: string[] = []
  private activePageKeysCache: { at: number; keys: Set<string> } | null = null
  private lastRefreshMs: number | null = null
  private lastRenderMs: number | null = null
  private autoRefreshPaused = true
  private controlsCollapsed = false
  private sortOrders: SortOrderMap = {}
  private sortModes: SortModeMap = {}
  private bodyScrollTop = 0
  private lastLocatedNodeKey: string | null = null
  private flashLocatedNodeKey: string | null = null
  private internalNavigationPageName: string | null = null
  private suppressBubbleClick = false
  private sortDragItem: SortableItem | null = null
  private readonly expandedKeys = new Set<string>()
  private readonly searchCollapsedKeys = new Set<string>()
  private readonly loadedKeys = new Set<string>()
  private readonly loadStates = new Map<string, LoadState>()
  private readonly loadErrors = new Map<string, string>()
  private renderFrameId: number | null = null
  private searchRenderTimeoutId: number | null = null
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
  private isComposing = false
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
    const hostDocument = this.getHostDocument()

    window.addEventListener('pointermove', this.handlePointerMove)
    window.addEventListener('pointerup', this.handlePointerUp)
    window.addEventListener('pointercancel', this.handlePointerUp)
    window.addEventListener('resize', this.handleWindowResize)
    window.addEventListener('focus', this.handleWindowFocus)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    hostDocument.addEventListener('input', this.handleSidebarSearchInput)
    hostDocument.addEventListener('compositionstart', this.handleCompositionStart)
    hostDocument.addEventListener('compositionend', this.handleCompositionEnd)
    hostDocument.addEventListener('keydown', this.handleSidebarKeydown)
    hostDocument.addEventListener('contextmenu', this.handleSidebarContextMenu, true)
    hostDocument.addEventListener('click', this.handleSidebarClick, true)
    hostDocument.addEventListener('pointerdown', this.handleGlobalPointerDown, true)
    window.addEventListener('pointerdown', this.handleGlobalPointerDown, true)

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
    if (this.renderFrameId !== null) {
      window.cancelAnimationFrame(this.renderFrameId)
    }
    if (this.searchRenderTimeoutId !== null) {
      window.clearTimeout(this.searchRenderTimeoutId)
    }
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
    hostDocument.removeEventListener('compositionstart', this.handleCompositionStart)
    hostDocument.removeEventListener('compositionend', this.handleCompositionEnd)
    hostDocument.removeEventListener('keydown', this.handleSidebarKeydown)
    hostDocument.removeEventListener('contextmenu', this.handleSidebarContextMenu, true)
    hostDocument.removeEventListener('click', this.handleSidebarClick, true)
    hostDocument.removeEventListener('pointerdown', this.handleGlobalPointerDown, true)
    window.removeEventListener('pointerdown', this.handleGlobalPointerDown, true)
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
    if (this.refreshing) {
      logseq.UI.showMsg(this.i18n.t('refreshing'), 'info')
      return
    }
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
      this.searchError = null
      this.clearSearchMatchState()
      this.render()
      return
    }

    this.searching = !this.treeService.hasChildIndex()
    this.searchError = null
    this.scheduleSearchRender()

    try {
      await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())
      if (this.searchQuery !== nextQuery) {
        return
      }

      this.searching = false
      this.searchError = null
      this.syncSearchMatchState(false)
      this.render()
    } catch (error) {
      if (this.searchQuery !== nextQuery) {
        return
      }

      this.searching = false
      this.searchError = extractErrorMessage(error, this.i18n.t('loadChildrenFailed'))
      this.clearSearchMatchState()
      this.render()
    }
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
      this.syncSearchMatchState()
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
    const path = await this.resolveCurrentPagePathOrWarn()
    if (!path) {
      return
    }

    this.revealPath(path, 'merge')
    this.render()
    this.scrollNodeIntoView(normalizeTitle(path[path.length - 1]))
  }

  focusCurrentPath = async (): Promise<void> => {
    const path = await this.resolveCurrentPagePathOrWarn()
    if (!path) {
      return
    }

    this.revealPath(path, 'replace')
    this.scrollNodeIntoView(normalizeTitle(path[path.length - 1]))
  }

  collapseOtherBranches = async (): Promise<void> => {
    const path = await this.resolveCurrentPagePathOrWarn()
    if (!path) {
      return
    }

    this.revealPath(path, 'replace')
    this.render()
  }

  focusPreviousSearchMatch = (): void => {
    this.moveActiveSearchMatch(-1)
  }

  focusNextSearchMatch = (): void => {
    this.moveActiveSearchMatch(1)
  }

  onNodeToggle = async (nodeKey: string): Promise<void> => {
    if (this.searchQuery) {
      if (this.searchCollapsedKeys.has(nodeKey)) {
        this.searchCollapsedKeys.delete(nodeKey)
      } else {
        this.searchCollapsedKeys.add(nodeKey)
      }
      this.syncSearchMatchState()
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
      this.loadErrors.set(nodeKey, extractErrorMessage(error, this.i18n.t('loadChildrenFailed')))
    }

    this.render()
  }

  openPage = (pageName: string): void => {
    const trimmed = pageName.trim()
    if (!trimmed) return
    this.internalNavigationPageName = trimmed
    this.currentPageName = trimmed
    void this.syncCurrentPagePath().then(() => {
      if (this.currentPagePath.length > 0) {
        this.revealPath(this.currentPagePath, 'merge')
      }
      this.render()
    })
    logseq.App.pushState('page', { name: trimmed })
  }

  openPageInRightSidebar = async (pageName: string): Promise<void> => {
    try {
      const page = await logseq.Editor.getPage(pageName)
      const pageId = page?.uuid ?? page?.id
      if (!pageId) {
        logseq.UI.showMsg(this.i18n.t('openInRightSidebarFailed', { title: pageName }), 'warning')
        return
      }

      logseq.Editor.openInRightSidebar(pageId)
    } catch {
      logseq.UI.showMsg(this.i18n.t('openInRightSidebarFailed', { title: pageName }), 'warning')
    }
  }

  openContextMenu = (menu: ContextMenuState): void => {
    const isSidebar = this.displayMode === 'sidebar'
    const doc = isSidebar ? this.getHostDocument() : document
    const viewportWidth = doc.defaultView?.innerWidth ?? window.innerWidth ?? 800
    const viewportHeight = doc.defaultView?.innerHeight ?? window.innerHeight ?? 600
    const menuWidth = 200
    const menuHeight = 240

    let x = menu.x
    let y = menu.y

    if (x + menuWidth > viewportWidth - 8) {
      x = Math.max(8, x - menuWidth)
    } else {
      x = Math.max(8, x)
    }

    if (y + menuHeight > viewportHeight - 8) {
      y = Math.max(8, y - menuHeight)
    } else {
      y = Math.max(8, y)
    }

    this.contextMenu = { ...menu, x, y }
    this.render()
    if (this.displayMode === 'sidebar') {
      void this.renderSidebarTreeUI()
    }
  }

  resolveContextMenuPosition(
    nodeKey: string,
    page: string,
    explicitX?: number,
    explicitY?: number,
  ): { x: number; y: number } {
    if (typeof explicitX === 'number' && typeof explicitY === 'number' && (explicitX > 0 || explicitY > 0)) {
      return { x: explicitX, y: explicitY }
    }

    if (this.lastPointerPos && Date.now() - this.lastPointerPos.time < 2000) {
      return { x: this.lastPointerPos.x, y: this.lastPointerPos.y }
    }

    try {
      const doc = this.getHostDocument()
      const escapedKey = escapeSelectorValue(nodeKey)
      const escapedPage = escapeSelectorValue(page)
      const trigger =
        doc.querySelector<HTMLElement>(`[data-node-key="${escapedKey}"] [data-role="sidebar-context-trigger"]`) ||
        doc.querySelector<HTMLElement>(`[data-page="${escapedPage}"] [data-role="sidebar-context-trigger"]`) ||
        doc.querySelector<HTMLElement>(`[data-node-key="${escapedKey}"]`) ||
        doc.querySelector<HTMLElement>(`[data-page="${escapedPage}"]`)

      if (trigger) {
        const rect = trigger.getBoundingClientRect()
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.bottom + 4),
        }
      }
    } catch {
      // ignore
    }

    return { x: 200, y: 200 }
  }

  closeContextMenu = (): void => {
    if (this.contextMenu) {
      this.contextMenu = null
      this.render()
      if (this.displayMode === 'sidebar') {
        void this.renderSidebarTreeUI()
      }
    }
  }

  async copyPageReference(page: string): Promise<void> {
    const ref = `[[${page}]]`
    const copied = await copyTextToClipboard(ref)
    if (copied) {
      logseq.UI.showMsg(this.i18n.t('toastCopiedRef', { ref }), 'success')
    } else {
      logseq.UI.showMsg(ref, 'warning')
    }
    this.closeContextMenu()
  }

  async copyPageTitle(page: string): Promise<void> {
    const copied = await copyTextToClipboard(page)
    if (copied) {
      logseq.UI.showMsg(this.i18n.t('toastCopiedTitle', { title: page }), 'success')
    } else {
      logseq.UI.showMsg(page, 'warning')
    }
    this.closeContextMenu()
  }

  async expandSubtree(page: string): Promise<void> {
    await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty())
    const visited = new Set<string>()
    const queue = [page]
    while (queue.length > 0) {
      const current = queue.shift()!
      const currentKey = normalizeTitle(current)
      if (visited.has(currentKey)) continue
      visited.add(currentKey)
      this.expandedKeys.add(currentKey)
      this.loadedKeys.add(currentKey)
      this.loadStates.set(currentKey, 'loaded')
      const children = this.treeService.getChildrenFor(current)
      for (const child of children) {
        const childKey = normalizeTitle(child)
        if (!visited.has(childKey)) {
          queue.push(child)
        }
      }
    }
    this.closeContextMenu()
    this.persistInternalState()
    this.render()
    if (this.displayMode === 'sidebar') {
      void this.renderSidebarTreeUI()
    }
  }

  collapseSubtree(page: string): void {
    const visited = new Set<string>()
    const queue = [page]
    while (queue.length > 0) {
      const current = queue.shift()!
      const currentKey = normalizeTitle(current)
      if (visited.has(currentKey)) continue
      visited.add(currentKey)
      this.expandedKeys.delete(currentKey)
      const children = this.treeService.getChildrenFor(current)
      for (const child of children) {
        const childKey = normalizeTitle(child)
        if (!visited.has(childKey)) {
          queue.push(child)
        }
      }
    }
    this.closeContextMenu()
    this.persistInternalState()
    this.render()
    if (this.displayMode === 'sidebar') {
      void this.renderSidebarTreeUI()
    }
  }

  executeContextMenuAction = async (action: string, page: string, parentKey: string): Promise<void> => {
    switch (action) {
      case 'open-in-right-sidebar':
        this.closeContextMenu()
        await this.openPageInRightSidebar(page)
        break
      case 'create-child-page':
        this.closeContextMenu()
        await this.createChildPage(page)
        break
      case 'copy-page-ref':
        await this.copyPageReference(page)
        break
      case 'copy-page-title':
        await this.copyPageTitle(page)
        break
      case 'expand-subtree':
        await this.expandSubtree(page)
        break
      case 'collapse-subtree':
        this.collapseSubtree(page)
        break
      case 'clear-custom-sort':
        this.closeContextMenu()
        this.clearCustomSortForParent(parentKey)
        break
      default:
        this.closeContextMenu()
        break
    }
  }

  createChildPage = async (parentTitle: string): Promise<void> => {
    const normalizedParentKey = normalizeTitle(parentTitle)
    if (!normalizedParentKey) {
      return
    }

    this.createChildDraftParent = parentTitle
    this.createChildDraftTitle = ''
    this.shouldFocusCreateChildInput = true
    this.render()
  }

  setCreateChildDraftTitle = (value: string): void => {
    if (!this.createChildDraftParent) {
      return
    }

    this.createChildDraftTitle = value
  }

  cancelCreateChildPage = (): void => {
    if (!this.createChildDraftParent && !this.createChildDraftTitle) {
      return
    }

    this.createChildDraftParent = null
    this.createChildDraftTitle = ''
    this.shouldFocusCreateChildInput = false
    this.render()
  }

  submitCreateChildPage = async (): Promise<void> => {
    const parentTitle = this.createChildDraftParent
    if (!parentTitle) {
      return
    }

    const normalizedParentKey = normalizeTitle(parentTitle)
    if (!normalizedParentKey) {
      return
    }

    const configuredProp = this.settings.getHierarchyProperty()
    const pageTagProperty = configuredProp && configuredProp !== 'parent' && configuredProp !== 'tags'
      ? configuredProp
      : '页面标签'
    const childTitle = unwrapPageRef(this.createChildDraftTitle).trim()
    if (!childTitle) {
      logseq.UI.showMsg(this.i18n.t('createChildEmpty'), 'warning')
      this.shouldFocusCreateChildInput = true
      this.render()
      return
    }

    if (normalizeTitle(childTitle) === normalizedParentKey) {
      logseq.UI.showMsg(this.i18n.t('createChildSelfParent'), 'warning')
      this.shouldFocusCreateChildInput = true
      this.render()
      return
    }

    const existing = await logseq.Editor.getPage(childTitle)
    if (existing && (await this.isPageActive(childTitle))) {
      logseq.UI.showMsg(this.i18n.t('createChildDuplicate', { title: childTitle }), 'warning')
      this.shouldFocusCreateChildInput = true
      this.render()
      return
    }

    const cleanParentTitle = unwrapPageRef(parentTitle).trim()
    let createdPageName: string | null = null
    try {
      // 1. Resolve parent page and entity ID
      const parentPage = await logseq.Editor.getPage(cleanParentTitle).catch(() => null)
      const parentRec = parentPage as Record<string, unknown> | null
      const parentId =
        typeof parentPage?.id === 'number'
          ? parentPage.id
          : typeof parentRec?.[':db/id'] === 'number'
            ? (parentRec[':db/id'] as number)
            : typeof parentRec?.['db/id'] === 'number'
              ? (parentRec['db/id'] as number)
              : null

      const isDb = await logseq.App.checkCurrentIsDbGraph().catch(() => false)
      const propEntity = await logseq.Editor.getProperty(pageTagProperty).catch(() => null)
      const propRec = propEntity as Record<string, unknown> | null
      const schema =
        (propEntity as any)?.schema ??
        (propRec?.[':property/schema'] as Record<string, unknown> | undefined) ??
        (propRec?.['property/schema'] as Record<string, unknown> | undefined) ??
        null
      const propType = schema?.type ?? schema?.[':type'] ?? (propEntity as any)?.type

      // Check parent's own property value shape as a reference template
      let parentSampleVal: unknown = undefined
      if (parentPage?.uuid) {
        try {
          const parentProps =
            (await logseq.Editor.getPageProperties(parentPage.uuid).catch(() => null)) ??
            (await logseq.Editor.getBlockProperties(parentPage.uuid).catch(() => null))
          if (parentProps && typeof parentProps === 'object') {
            parentSampleVal = findPropertyValue(parentProps, pageTagProperty)
          }
        } catch {
          // ignore
        }
      }

      // Build ordered candidate values for 页面标签
      const candidateValues: unknown[] = []
      if (parentSampleVal !== undefined) {
        if (Array.isArray(parentSampleVal)) {
          if (
            parentSampleVal.length > 0 &&
            (typeof parentSampleVal[0] === 'number' ||
              (typeof parentSampleVal[0] === 'object' && parentSampleVal[0] !== null))
          ) {
            if (parentId != null) candidateValues.push([parentId])
          } else if (parentSampleVal.length > 0 && typeof parentSampleVal[0] === 'string') {
            candidateValues.push([cleanParentTitle])
          }
        } else if (typeof parentSampleVal === 'number' && parentId != null) {
          candidateValues.push(parentId)
        } else if (typeof parentSampleVal === 'string') {
          candidateValues.push(cleanParentTitle)
        }
      }

      if (isDb || propType === 'node') {
        if (parentId != null) {
          if (!candidateValues.some((c) => Array.isArray(c) && c[0] === parentId)) {
            candidateValues.push([parentId])
          }
          if (!candidateValues.includes(parentId)) {
            candidateValues.push(parentId)
          }
        }
        if (!candidateValues.includes(cleanParentTitle)) {
          candidateValues.push(cleanParentTitle)
        }
        if (!candidateValues.some((c) => Array.isArray(c) && c[0] === cleanParentTitle)) {
          candidateValues.push([cleanParentTitle])
        }
      } else {
        if (!candidateValues.includes(cleanParentTitle)) {
          candidateValues.push(cleanParentTitle)
        }
        if (!candidateValues.some((c) => Array.isArray(c) && c[0] === cleanParentTitle)) {
          candidateValues.push([cleanParentTitle])
        }
        if (parentId != null) {
          candidateValues.push([parentId], parentId)
        }
      }
      candidateValues.push(`[[${cleanParentTitle}]]`)

      // Helper to extract UUID and ID safely across Transit / JS objects
      const extractIdAndUuid = (page: unknown): { uuid: string | null; id: number | null } => {
        if (!page || typeof page !== 'object') return { uuid: null, id: null }
        const rec = page as Record<string, unknown>
        let uuid: string | null = null
        if (typeof rec.uuid === 'string' && rec.uuid.trim()) {
          uuid = rec.uuid.trim()
        } else if (typeof rec[':block/uuid'] === 'string' && (rec[':block/uuid'] as string).trim()) {
          uuid = (rec[':block/uuid'] as string).trim()
        } else if (typeof rec.uuid === 'object' && rec.uuid !== null && typeof (rec.uuid as any).uuid === 'string') {
          uuid = (rec.uuid as any).uuid
        }

        let id: number | null = null
        if (typeof rec.id === 'number') {
          id = rec.id
        } else if (typeof rec[':db/id'] === 'number') {
          id = rec[':db/id'] as number
        } else if (typeof rec['db/id'] === 'number') {
          id = rec['db/id'] as number
        }

        return { uuid, id }
      }

      // Helper to check whether property is written on the page
      const checkPageProperties = async (title: string, uuid: string | null, id: number | null): Promise<boolean> => {
        try {
          const fresh = await logseq.Editor.getPage(title).catch(() => null)
          if (fresh) {
            if (fresh.properties && typeof fresh.properties === 'object') {
              if (findPropertyValue(fresh.properties as Record<string, unknown>, pageTagProperty) != null) {
                return true
              }
            }
            if (findPropertyValue(fresh as Record<string, unknown>, pageTagProperty) != null) {
              return true
            }
            const rec = fresh as Record<string, unknown>
            const tags = rec[':block/tags'] ?? rec['block/tags'] ?? rec.tags
            if (tags != null && (Array.isArray(tags) ? tags.length > 0 : Boolean(tags))) {
              return true
            }
          }
          const target = uuid ?? id ?? title
          const pageProps = await logseq.Editor.getPageProperties(target).catch(() => null)
          if (pageProps && findPropertyValue(pageProps, pageTagProperty) != null) {
            return true
          }
          const blockProps = await logseq.Editor.getBlockProperties(target).catch(() => null)
          if (blockProps && findPropertyValue(blockProps, pageTagProperty) != null) {
            return true
          }
        } catch {
          // ignore
        }
        return false
      }

      // 2. Create page - first try atomic creation with the property directly
      let createdPage: PageEntity | null = null
      for (const key of ['Page Tags', pageTagProperty, 'page-tags', '页面标签']) {
        for (const val of candidateValues) {
          if (val == null) continue
          try {
            createdPage = await logseq.Editor.createPage(
              childTitle,
              { [key]: val },
              { redirect: false },
            )
            if (createdPage) {
              break
            }
          } catch {
            // Fall through to next candidate or fallback
          }
        }
        if (createdPage) break
      }

      // If createPage with property failed, try standard createPage
      if (!createdPage) {
        try {
          createdPage = await logseq.Editor.createPage(childTitle, {}, { redirect: false })
        } catch {
          createdPage = await logseq.Editor.createPage(childTitle).catch(() => null)
        }
      }

      if (!createdPage) {
        createdPage = await logseq.Editor.getPage(childTitle).catch(() => null)
      }

      if (!createdPage) {
        throw new Error(this.i18n.t('createChildEmpty'))
      }

      const createdTitle = pageTitle(createdPage) ?? childTitle
      createdPageName = createdTitle

      let { uuid: pageUuid, id: pageDbId } = extractIdAndUuid(createdPage)
      if (!pageUuid && pageDbId == null) {
        const fresh = await logseq.Editor.getPage(createdTitle).catch(() => null)
        if (fresh) {
          const freshIds = extractIdAndUuid(fresh)
          pageUuid = freshIds.uuid
          pageDbId = freshIds.id
        }
      }

      // 3. Resolve parent tag entity for Logseq DB tagging
      let parentTagUuid: string | null = null
      let parentTagId: number | null = parentId

      try {
        const parentTag = await logseq.Editor.getTag(cleanParentTitle).catch(() => null)
        if (parentTag) {
          const ids = extractIdAndUuid(parentTag)
          if (ids.uuid) parentTagUuid = ids.uuid
          if (ids.id != null) parentTagId = ids.id
        }
      } catch {
        // ignore
      }

      if (!parentTagUuid) {
        try {
          const createdTag = await logseq.Editor.createTag(cleanParentTitle).catch(() => null)
          if (createdTag) {
            const ids = extractIdAndUuid(createdTag)
            if (ids.uuid) parentTagUuid = ids.uuid
            if (ids.id != null) parentTagId = ids.id
          }
        } catch {
          // ignore
        }
      }

      if (!parentTagUuid && parentPage) {
        const ids = extractIdAndUuid(parentPage)
        if (ids.uuid) parentTagUuid = ids.uuid
        if (ids.id != null && parentTagId == null) parentTagId = ids.id
      }

      // 4. In Logseq DB, page tags (Page Tags / 页面标签) are attached via addBlockTag(pageUuid, parentTagUuid)
      if (pageUuid && parentTagUuid) {
        try {
          await logseq.Editor.addBlockTag(pageUuid, parentTagUuid)
        } catch (tagErr) {
          console.warn('[DB Favorite Tree] addBlockTag with parentTagUuid failed:', tagErr)
        }
      }
      if (pageUuid && parentPage) {
        const pUuid = extractIdAndUuid(parentPage).uuid
        if (pUuid && pUuid !== parentTagUuid) {
          try {
            await logseq.Editor.addBlockTag(pageUuid, pUuid)
          } catch {
            // ignore
          }
        }
      }

      // 5. Upsert hierarchy property values directly on page entity
      const targetIdentities: Array<string | number> = []
      if (pageUuid) targetIdentities.push(pageUuid)
      if (pageDbId != null && !targetIdentities.includes(pageDbId)) targetIdentities.push(pageDbId)

      const propertyKeysToTry = Array.from(
        new Set([
          'Page Tags',
          'page-tags',
          'page tags',
          pageTagProperty,
          '页面标签',
          ':logseq.property/page-tags',
          ':user.property/Page Tags',
          pageTagProperty.startsWith(':') ? pageTagProperty : `:user.property/${pageTagProperty}`,
        ])
      ).filter(Boolean)

      const candidateValsToTry: unknown[] = []
      if (parentTagId != null) {
        candidateValsToTry.push([parentTagId], parentTagId)
      }
      for (const c of candidateValues) {
        if (!candidateValsToTry.includes(c)) candidateValsToTry.push(c)
      }

      let propertyConfirmed = await checkPageProperties(createdTitle, pageUuid, pageDbId)
      if (!propertyConfirmed) {
        for (const target of targetIdentities) {
          for (const propKey of propertyKeysToTry) {
            for (const candidateVal of candidateValsToTry) {
              if (candidateVal == null) continue
              try {
                await logseq.Editor.upsertBlockProperty(target, propKey, candidateVal)
                if (await checkPageProperties(createdTitle, pageUuid, pageDbId)) {
                  propertyConfirmed = true
                  break
                }
              } catch {
                // Proceed through candidates
              }
            }
            if (propertyConfirmed) break
          }
          if (propertyConfirmed) break
        }
      }

      // Fallback: If page-level property upsert did not take effect, try prepending a block
      if (!propertyConfirmed && pageUuid) {
        try {
          const prepended = await logseq.Editor.prependBlockInPage(pageUuid, '').catch(() => null)
          if (prepended?.uuid) {
            for (const propKey of propertyKeysToTry) {
              for (const candidateVal of candidateValsToTry) {
                if (candidateVal == null) continue
                try {
                  await logseq.Editor.upsertBlockProperty(prepended.uuid, propKey, candidateVal)
                  if (await checkPageProperties(createdTitle, pageUuid, pageDbId)) {
                    propertyConfirmed = true
                    break
                  }
                } catch {
                  // ignore
                }
              }
              if (propertyConfirmed) break
            }
          }
        } catch {
          // ignore
        }
      }

      // 7. Verify linking with tree service & properties
      const isChildLinked = async (): Promise<boolean> => {
        this.treeService.invalidateIndex()
        await this.treeService.ensureChildIndex(pageTagProperty, true)
        const children = this.treeService.getChildrenFor(cleanParentTitle)
        if (children.map(normalizeTitle).includes(normalizeTitle(createdTitle))) {
          return true
        }
        return await checkPageProperties(createdTitle, pageUuid, pageDbId)
      }

      for (const delayMs of [100, 200, 300, 500]) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        if (await isChildLinked()) {
          break
        }
      }

      this.createChildDraftParent = null
      this.createChildDraftTitle = ''
      this.shouldFocusCreateChildInput = false
      this.expandedKeys.add(normalizedParentKey)
      this.loadedKeys.add(normalizedParentKey)
      this.loadStates.set(normalizedParentKey, 'loaded')
      this.loadErrors.delete(normalizedParentKey)

      this.treeService.invalidateIndex()
      await this.refresh('manual')
      this.scrollNodeIntoView(normalizeTitle(createdTitle))

      logseq.UI.showMsg(this.i18n.t('createChildSuccess', { title: createdTitle, parent: parentTitle }), 'success')
    } catch (error) {
      const message = extractErrorMessage(error, this.i18n.t('loadChildrenFailed'))
      let rolledBack = false

      if (createdPageName) {
        try {
          await logseq.Editor.deletePage(createdPageName)
          rolledBack = true
        } catch {
          rolledBack = false
        }
      }

      if (createdPageName) {
        logseq.UI.showMsg(
          rolledBack
            ? this.i18n.t('createChildFailedRolledBack', { message })
            : this.i18n.t('createChildFailedNeedsCleanup', { title: createdPageName, message }),
          'warning',
        )
      } else {
        logseq.UI.showMsg(
          this.i18n.t('createChildFailedRolledBack', { message }),
          'warning',
        )
      }
    } finally {
      this.render()
    }
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
    if (this.searchQuery) {
      this.syncSearchMatchState()
    }
    this.persistInternalState()
    this.render()
  }

  clearCustomSortForParent = (parentKey: string): void => {
    const key = this.normalizeSortParentKey(parentKey)
    if (!key || !this.hasCustomSortOrder(key)) {
      return
    }

    const confirmed = this.getHostWindow().confirm(this.i18n.t('clearCustomSortConfirm'))
    if (!confirmed) {
      return
    }

    const { [key]: _removedOrder, ...remainingOrders } = this.sortOrders
    const { [key]: _removedMode, ...remainingModes } = this.sortModes
    this.sortOrders = remainingOrders
    this.sortModes = remainingModes
    if (this.searchQuery) {
      this.syncSearchMatchState()
    }
    this.persistInternalState()
    this.render()
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
      logseq.DB.onChanged((payload) => {
        if (shouldRefreshOnDbChange(payload as any, this.settings.getHierarchyProperty())) {
          this.scheduleRefresh('db-changed')
        }
      }),
    )

    this.offHooks.push(
      logseq.App.onRouteChanged((route: any) => {
        let routePage: string | null = null
        if (route && typeof route.path === 'string' && route.path.startsWith('/page/')) {
          try {
            routePage = decodeURIComponent(route.path.slice(6).replace(/\+/g, ' ')).trim()
          } catch {
            routePage = route.path.slice(6).trim()
          }
        }

        const hint = this.internalNavigationPageName || routePage
        this.internalNavigationPageName = null

        if (hint) {
          this.currentPageName = hint
          void this.syncCurrentPagePath().then(() => {
            if (this.currentPagePath.length > 0) {
              this.revealPath(this.currentPagePath, 'merge')
            }
            this.render()
          })
        }

        if (this.routeTimerId !== null) {
          window.clearTimeout(this.routeTimerId)
        }
        this.routeTimerId = window.setTimeout(() => {
          void this.updateCurrentPage(hint)
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
      logseq.App.onSidebarVisibleChanged(() => {
        void this.syncSidebarTreeVisibility()
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
          this.treeService.invalidateIndex(true)
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
      this.pendingRefreshReason = reason
      return
    }

    const refreshStartedAt = performance.now()
    this.activePageKeysCache = null
    this.treeService.invalidateIndex(false)
    this.refreshing = true
    this.render()
    try {
      await this.syncLocale()
    } catch {
      // Ignore locale refresh failures during manual refresh cycles.
    }

    try {
      this.rootFavorites = await this.treeService.loadFavoriteRoots()
      await this.syncDerivedTreeState()

      this.lastRefreshAt = Date.now()
      this.lastRefreshReason = reason
      this.lastRefreshError = null
      this.lastRefreshMs = Math.max(0, Math.round(performance.now() - refreshStartedAt))
    } catch (error) {
      const message = extractErrorMessage(error, this.i18n.t('refreshReasonDefault'))
      this.lastRefreshAt = Date.now()
      this.lastRefreshReason = reason
      this.lastRefreshError = message
      this.lastRefreshMs = Math.max(0, Math.round(performance.now() - refreshStartedAt))
      logseq.UI.showMsg(this.i18n.t('refreshToastFailed', { message }), 'warning')
    } finally {
      this.refreshing = false
      this.render()
      if (this.pendingRefreshReason !== null) {
        const nextReason = this.pendingRefreshReason
        this.pendingRefreshReason = null
        void this.refresh(nextReason)
      }
    }
  }

  private async updateCurrentPage(targetTitleHint?: string | null): Promise<void> {
    let currentTitle: string | null = null
    try {
      const current = await logseq.Editor.getCurrentPage()
      currentTitle = normalizeCurrentPageTitle(current)
    } catch {
      // ignore
    }

    if (!currentTitle && targetTitleHint) {
      currentTitle = targetTitleHint
    }

    this.currentPageName = await this.resolveExistingCurrentPageTitle(currentTitle)
    const currentPageKey = normalizeTitle(this.currentPageName)
    if (this.lastLocatedNodeKey && this.lastLocatedNodeKey !== currentPageKey) {
      this.lastLocatedNodeKey = null
      this.persistInternalState()
    }
    await this.syncCurrentPagePath()
    if (this.currentPagePath.length > 0) {
      this.revealPath(this.currentPagePath, 'merge')
    }
    this.render()
  }

  private render(): void {
    const renderStartedAt = performance.now()
    this.captureBodyScrollTop()
    const activeElement = document.activeElement
    const shouldRestoreSearchFocus =
      activeElement instanceof HTMLInputElement && activeElement.dataset.role === 'search-input'
    const selectionStart = shouldRestoreSearchFocus ? activeElement.selectionStart ?? this.searchQuery.length : null
    const selectionEnd = shouldRestoreSearchFocus ? activeElement.selectionEnd ?? this.searchQuery.length : null

    const shouldRenderMainPanel = this.displayMode !== 'sidebar' && this.panelVisible
    if (shouldRenderMainPanel) {
      this.root.innerHTML = renderFavoriteTree(
        this.getRenderState(),
        {
          getChildrenFor: (title) => this.getOrderedChildrenFor(title),
        },
        this.i18n,
      )
    } else {
      this.root.innerHTML = ''
    }
    void this.renderSidebarTreeUI()

    if (shouldRenderMainPanel) {
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

    this.restoreCreateChildInputFocus()
    this.lastRenderMs = Math.max(0, Math.round(performance.now() - renderStartedAt))
  }

  private scheduleSearchRender(): void {
    if (this.renderFrameId !== null) {
      window.cancelAnimationFrame(this.renderFrameId)
      this.renderFrameId = null
    }
    if (this.searchRenderTimeoutId !== null) {
      window.clearTimeout(this.searchRenderTimeoutId)
    }
    this.searchRenderTimeoutId = window.setTimeout(() => {
      this.searchRenderTimeoutId = null
      this.render()
    }, 100)
  }

  private getRenderState(): TreeStateSnapshot {
    const indexMs = this.treeService.getLastIndexBuildMs()
    const pages = this.treeService.getLastIndexBuildPageCount()
    const perfSummary =
      this.lastRefreshMs !== null && this.lastRenderMs !== null
        ? this.i18n.t('perfSummary', {
            refreshMs: this.lastRefreshMs,
            renderMs: this.lastRenderMs,
            indexMs: indexMs ?? '-',
            roots: this.rootFavorites.length,
            expanded: this.expandedKeys.size,
            pages: pages ?? '-',
          })
        : null

    return {
      rootFavorites: this.getOrderedTitlesForParent(ROOT_SORT_KEY),
      sortOrders: this.sortOrders,
      sortModes: this.sortModes,
      createChildDraftParent: this.createChildDraftParent,
      createChildDraftTitle: this.createChildDraftTitle,
      perfSummary,
      expandedKeys: this.expandedKeys,
      searchCollapsedKeys: this.searchCollapsedKeys,
      loadedKeys: this.loadedKeys,
      loadStates: this.loadStates,
      loadErrors: this.loadErrors,
      searchError: this.searchError,
      currentSearchMatchKey: this.activeSearchMatchKey,
      currentSearchMatchNumber: this.getCurrentSearchMatchNumber(),
      searchMatchCount: this.searchMatchKeys.length,
      currentPageName: this.currentPageName,
      currentPagePath: this.currentPagePath,
      lastLocatedNodeKey: this.lastLocatedNodeKey,
      flashLocatedNodeKey: this.flashLocatedNodeKey,
      refreshing: this.refreshing,
      searching: this.searching,
      searchQuery: this.searchQuery,
      lastRefreshError: this.lastRefreshError,
      hasHierarchyRelations: this.hasHierarchyRelations(),
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
      contextMenu: this.contextMenu,
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
        this.findRenderedNodeElement(nodeKey)?.scrollIntoView({
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

  private async syncSidebarTreeVisibility(): Promise<void> {
    if (this.displayMode !== 'sidebar') {
      this.clearSidebarTreeUI()
      return
    }

    const path = await this.resolveSidebarTreePath()
    if (path) {
      await this.renderSidebarTreeUI()
      return
    }

    this.clearSidebarTreeUI()
  }

  private clearSidebarTreeUI(targetPath?: string): void {
    const paths = targetPath ? [targetPath] : this.sidebarTreePath ? [this.sidebarTreePath] : []
    this.sidebarRenderVersion += 1
    this.sidebarTreePath = null
    this.sidebarTreeTemplate = ''

    for (const path of paths) {
      logseq.UI.queryElementRect(path)
        .then((rect) => {
          if (rect) {
            logseq.provideUI({
              key: FavoriteTreePlugin.SIDEBAR_TREE_UI_KEY,
              path,
              reset: true,
              template: '',
            })
          }
        })
        .catch(() => {})
    }
  }

  private async resolveSidebarTreePath(): Promise<string | null> {
    for (const path of FavoriteTreePlugin.SIDEBAR_TREE_PATHS) {
      try {
        const rect = await logseq.UI.queryElementRect(path)
        if (rect) {
          return path
        }
      } catch {
        // Ignore errors
      }
    }

    return null
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

  private getHostWindow(): Window {
    try {
      if (window.top) {
        return window.top
      }
    } catch {
      // Ignore cross-frame access failures and fall back to the plugin iframe window.
    }

    return window
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

  private asCreateChildInput(target: EventTarget | null): HTMLInputElement | null {
    if (!target || typeof target !== 'object') {
      return null
    }

    const candidate = target as Partial<HTMLInputElement> & {
      getAttribute?: (name: string) => string | null
      tagName?: string
    }

    if (candidate.getAttribute?.('data-role') !== 'create-child-input') {
      return null
    }

    if (typeof candidate.tagName !== 'string' || candidate.tagName.toUpperCase() !== 'INPUT') {
      return null
    }

    return target as HTMLInputElement
  }

  private restoreCreateChildInputFocus(): void {
    if (!this.shouldFocusCreateChildInput) {
      return
    }

    this.shouldFocusCreateChildInput = false
    const focus = (): void => {
      const selector = '[data-role="create-child-input"]'
      const target =
        this.displayMode === 'sidebar'
          ? this.getHostDocument().querySelector<HTMLInputElement>(`[data-favorite-sidebar-tree="true"] ${selector}`)
          : this.root.querySelector<HTMLInputElement>(selector)

      if (!target) {
        return
      }

      target.focus({ preventScroll: false })
      const length = target.value.length
      target.setSelectionRange(length, length)
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(focus)
    })
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
    const sidebarSearchInput = this.asSidebarSearchInput(event.target)
    if (sidebarSearchInput) {
      if (!this.isComposing) {
        void this.setSearchQuery(sidebarSearchInput.value)
      }
      return
    }

    const createChildInput = this.asCreateChildInput(event.target)
    if (createChildInput) {
      this.setCreateChildDraftTitle(createChildInput.value)
    }
  }

  private readonly handleCompositionStart = (): void => {
    this.isComposing = true
  }

  private readonly handleCompositionEnd = (event: CompositionEvent): void => {
    this.isComposing = false
    const target = event.target as HTMLInputElement | null
    if (target && this.asSidebarSearchInput(target)) {
      void this.setSearchQuery(target.value)
    }
  }

  private readonly handleSidebarKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.contextMenu) {
      event.preventDefault()
      this.closeContextMenu()
      return
    }

    const target = this.asCreateChildInput(event.target)
    if (!target) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      void this.submitCreateChildPage()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelCreateChildPage()
    }
  }

  private readonly handleSidebarContextMenu = (event: MouseEvent): void => {
    if (this.displayMode !== 'sidebar') return
    const hostDocument = this.getHostDocument()
    const sidebarRoot = hostDocument.querySelector('[data-favorite-sidebar-tree="true"]')
    if (!sidebarRoot || !sidebarRoot.contains(event.target as Node)) return

    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('.favorite-sidebar-tree__row')
    if (!row) return

    event.preventDefault()
    event.stopPropagation()

    const page = row.dataset.page || row.querySelector<HTMLElement>('[data-page]')?.dataset.page
    if (!page) return

    const parentKey = row.dataset.parentKey || row.closest<HTMLElement>('[data-parent-key]')?.dataset.parentKey || normalizeTitle(page)
    const nodeKey = row.dataset.key || normalizeTitle(page)
    const hasChildren = row.closest('.favorite-sidebar-tree__node')?.querySelector('.favorite-sidebar-tree__children') !== null
      || this.treeService.getChildrenFor(page).length > 0
    const hasCustomSort = !!(this.sortOrders[normalizeTitle(page)]?.length)
    const isExpanded = this.expandedKeys.has(normalizeTitle(page))

    this.openContextMenu({
      page,
      parentKey,
      nodeKey,
      x: event.clientX,
      y: event.clientY,
      hasChildren,
      hasCustomSort,
      isExpanded,
    })
  }

  private readonly handleSidebarClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null
    const trigger = target?.closest<HTMLElement>('[data-role="sidebar-context-trigger"]')
    if (trigger) {
      event.preventDefault()
      event.stopPropagation()
      const page = trigger.dataset.page
      if (!page) return
      const parentKey = trigger.dataset.parentKey || normalizeTitle(page)
      const nodeKey = trigger.dataset.key || normalizeTitle(page)
      const rect = trigger.getBoundingClientRect()
      const hasChildren = trigger.dataset.hasChildren === 'true'
      const hasCustomSort = trigger.dataset.hasCustomSort === 'true'
      const isExpanded = trigger.dataset.isExpanded === 'true'
      const clickX = typeof event.clientX === 'number' && event.clientX > 0 ? event.clientX : (this.lastPointerPos?.x ?? Math.round(rect.left))
      const clickY = typeof event.clientY === 'number' && event.clientY > 0 ? event.clientY : (this.lastPointerPos?.y ?? Math.round(rect.bottom + 4))
      this.openContextMenu({
        page,
        parentKey,
        nodeKey,
        x: clickX,
        y: clickY,
        hasChildren,
        hasCustomSort,
        isExpanded,
      })
      return
    }

    const actionBtn = target?.closest<HTMLElement>('[data-context-action]')
    if (actionBtn) {
      event.preventDefault()
      event.stopPropagation()
      const action = actionBtn.dataset.contextAction
      const page = actionBtn.dataset.page
      const parentKey = actionBtn.dataset.parentKey || ''
      if (action && page) {
        void this.executeContextMenuAction(action, page, parentKey)
      }
      return
    }

    if (this.contextMenu && !target?.closest('.favorite-sidebar-tree__context-menu') && !target?.closest('.ft-context-menu')) {
      this.closeContextMenu()
    }
  }

  private readonly handleGlobalPointerDown = (event: Event): void => {
    const mouseEvent = event as MouseEvent
    if (typeof mouseEvent.clientX === 'number' && typeof mouseEvent.clientY === 'number') {
      this.lastPointerPos = {
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        time: Date.now(),
      }
    }

    if (!this.contextMenu) return
    const target = event.target as HTMLElement | null
    if (
      target?.closest('.ft-context-menu') ||
      target?.closest('.favorite-sidebar-tree__context-menu') ||
      target?.closest('[data-role="sidebar-context-trigger"]') ||
      target?.closest('[data-action="open-context-menu"]')
    ) {
      return
    }
    this.closeContextMenu()
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
    const rawProp = logseq.settings?.hierarchyProperty
    if (rawProp === 'parent' || rawProp === 'tags') {
      try {
        logseq.updateSettings({ hierarchyProperty: '页面标签' })
      } catch {
        // ignore
      }
    }
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
    this.searchError = null
    this.clearSearchMatchState()
    if (this.searchRenderTimeoutId !== null) {
      window.clearTimeout(this.searchRenderTimeoutId)
      this.searchRenderTimeoutId = null
    }
    if (this.renderFrameId !== null) {
      window.cancelAnimationFrame(this.renderFrameId)
      this.renderFrameId = null
    }
    this.currentPagePath = []
    this.flashLocatedNodeKey = null
    this.sortDragItem = null
    this.lastRefreshAt = null
    this.lastRefreshReason = null
    this.lastRefreshError = null

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
    this.treeService.invalidateIndex(true)
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
      this.searchError = null
      this.clearSearchMatchState()
      return
    }

    if (this.searchQuery) {
      this.searching = true
    }

    await this.treeService.ensureChildIndex(this.settings.getHierarchyProperty(), true)
    this.searchError = null
    this.syncExpandedLoadState()
    await this.syncCurrentPagePath()
    this.searching = false
    this.syncSearchMatchState()
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

  private async resolveExistingCurrentPageTitle(currentTitle: string | null): Promise<string | null> {
    if (!currentTitle || !currentTitle.trim()) {
      return null
    }

    return currentTitle.trim()
  }

  private async isPageActive(title: string): Promise<boolean> {
    const key = normalizeTitle(title)
    if (!key) {
      return false
    }

    try {
      const keys = await this.getActivePageKeys()
      return keys.has(key)
    } catch {
      try {
        return Boolean(await logseq.Editor.getPage(title))
      } catch {
        return false
      }
    }
  }

  private async getActivePageKeys(): Promise<Set<string>> {
    const now = Date.now()
    const cached = this.activePageKeysCache
    if (cached && now - cached.at < 1500) {
      return cached.keys
    }

    const pages = (await logseq.Editor.getAllPages()) ?? []
    const keys = new Set<string>()
    for (const page of pages) {
      if (isPageDeletedLike(page as Record<string, unknown>)) {
        continue
      }
      const title = pageTitle(page)
      const normalized = normalizeTitle(title)
      if (normalized) {
        keys.add(normalized)
      }
    }

    this.activePageKeysCache = { at: now, keys }
    return keys
  }



  private async resolveCurrentPagePathOrWarn(): Promise<string[] | null> {
    await this.updateCurrentPage()

    if (!this.currentPageName) {
      logseq.UI.showMsg(this.i18n.t('locateNoCurrentPage'), 'warning')
      return null
    }

    if (!this.currentPagePath.length) {
      logseq.UI.showMsg(this.i18n.t('locatePageNotInTree'), 'warning')
      return null
    }

    return [...this.currentPagePath]
  }

  private revealPath(path: string[], mode: 'merge' | 'replace'): void {
    if (mode === 'replace') {
      this.expandedKeys.clear()
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
  }

  private clearSearchMatchState(): void {
    this.activeSearchMatchKey = null
    this.searchMatchKeys = []
  }

  private syncSearchMatchState(preferFirstMatch = false): void {
    const nextMatchKeys = this.collectVisibleSearchMatchKeys()
    this.searchMatchKeys = nextMatchKeys

    if (!nextMatchKeys.length) {
      this.activeSearchMatchKey = null
      return
    }

    if (this.activeSearchMatchKey && nextMatchKeys.includes(this.activeSearchMatchKey) && !preferFirstMatch) {
      return
    }

    this.activeSearchMatchKey = nextMatchKeys[0]
  }

  private collectVisibleSearchMatchKeys(): string[] {
    const normalizedQuery = normalizeTitle(this.searchQuery)
    if (!normalizedQuery) {
      return []
    }

    const matchKeys: string[] = []
    for (const title of this.rootFavorites) {
      this.collectVisibleSearchMatchKeysForNode(title, normalizedQuery, [], false, matchKeys)
    }
    return matchKeys
  }

  private collectVisibleSearchMatchKeysForNode(
    title: string,
    normalizedQuery: string,
    ancestors: string[],
    hiddenByCollapsedAncestor: boolean,
    matchKeys: string[],
  ): boolean {
    const key = normalizeTitle(title)
    if (!key || ancestors.includes(key)) {
      return false
    }

    const selfMatches = key.includes(normalizedQuery)
    if (selfMatches && !hiddenByCollapsedAncestor) {
      matchKeys.push(key)
    }

    const nextAncestors = [...ancestors, key]
    const hideChildren = hiddenByCollapsedAncestor || this.searchCollapsedKeys.has(key)
    let descendantMatches = false
    for (const childTitle of this.getOrderedChildrenFor(title)) {
      descendantMatches =
        this.collectVisibleSearchMatchKeysForNode(childTitle, normalizedQuery, nextAncestors, hideChildren, matchKeys) ||
        descendantMatches
    }

    return selfMatches || descendantMatches
  }

  private getCurrentSearchMatchNumber(): number {
    if (!this.activeSearchMatchKey) {
      return 0
    }

    const index = this.searchMatchKeys.indexOf(this.activeSearchMatchKey)
    return index >= 0 ? index + 1 : 0
  }

  private moveActiveSearchMatch(step: -1 | 1): void {
    if (!this.searchQuery) {
      return
    }

    this.syncSearchMatchState()
    if (!this.searchMatchKeys.length) {
      return
    }

    const currentIndex = this.activeSearchMatchKey ? this.searchMatchKeys.indexOf(this.activeSearchMatchKey) : -1
    const baseIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (baseIndex + step + this.searchMatchKeys.length) % this.searchMatchKeys.length
    this.activeSearchMatchKey = this.searchMatchKeys[nextIndex]
    this.render()
    this.scrollActiveSearchMatchIntoView()
  }

  private scrollActiveSearchMatchIntoView(): void {
    const nodeKey = this.activeSearchMatchKey
    if (!nodeKey) {
      return
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.findRenderedNodeElement(nodeKey)?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        })
      })
    })
  }

  private findRenderedNodeElement(nodeKey: string): HTMLElement | null {
    const selector = `[data-node-key="${escapeSelectorValue(nodeKey)}"]`
    if (this.displayMode === 'sidebar') {
      return this.getHostDocument().querySelector<HTMLElement>(`[data-favorite-sidebar-tree="true"] ${selector}`)
    }

    return (
      this.root.querySelector<HTMLElement>(selector) ??
      this.getHostDocument().querySelector<HTMLElement>(`[data-favorite-sidebar-tree="true"] ${selector}`)
    )
  }

  private getOrderedChildrenFor(parentTitle: string): string[] {
    return this.applySortOrder(this.treeService.getChildrenFor(parentTitle), normalizeTitle(parentTitle))
  }

  private getOrderedTitlesForParent(parentKey: string): string[] {
    return parentKey === ROOT_SORT_KEY ? this.applySortOrder(this.rootFavorites, ROOT_SORT_KEY) : this.getOrderedChildrenFor(parentKey)
  }

  private hasHierarchyRelations(): boolean {
    if (!this.rootFavorites.length || !this.treeService.hasChildIndex()) {
      return false
    }

    return this.rootFavorites.some((title) => this.treeService.getChildrenFor(title).length > 0)
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

function normalizeCurrentPageTitle(current: unknown): string | null {
  if (!current) {
    return null
  }
  if (typeof current === 'string' && current.trim()) {
    return current.trim()
  }
  if (typeof current === 'object') {
    return pageTitle(current as Partial<PageLookup>)
  }
  return null
}
