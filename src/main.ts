import '@logseq/libs'
import type { PageEntity, SettingSchemaDesc, ThemeMode } from '@logseq/libs/dist/LSPlugin'
import './style.css'

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'
type ViewMode = 'panel' | 'bubble'
type DragKind = 'panel' | 'bubble'

type DragState = {
  kind: DragKind
  pointerId: number
  startScreenX: number
  startScreenY: number
  originX: number
  originY: number
  moved: boolean
  handleElement: HTMLElement | null
}

type PluginSettings = {
  hierarchyProperty?: string
  panelWidth?: number
  pollIntervalSeconds?: number
  sidebarPosition?: string
  __panelVisible?: boolean
  __expandedKeys?: string[]
  __autoRefreshPaused?: boolean
  __bodyScrollTop?: number
  __lastLocatedNodeKey?: string
  __viewMode?: ViewMode
  __panelX?: number
  __panelY?: number
  __bubbleX?: number
  __bubbleY?: number
} & Record<string, unknown>

const SETTINGS_SCHEMA: SettingSchemaDesc[] = [
  {
    key: 'hierarchyProperty',
    type: 'string',
    default: 'parent',
    title: '层级属性名',
    description: '用于声明父页面的属性名，默认值为 parent。属性值支持单值或多值节点。',
  },
  {
    key: 'panelWidth',
    type: 'number',
    default: 320,
    title: '面板宽度',
    description: '收藏树展开为悬浮面板时的宽度，单位为像素。',
  },
  {
    key: 'pollIntervalSeconds',
    type: 'number',
    default: 5,
    title: '自动刷新间隔（秒）',
    description: '轮询自动刷新的时间间隔，单位为秒。',
  },
  {
    key: 'sidebarPosition',
    type: 'enum',
    default: 'left',
    title: '初始侧向偏好',
    description: '首次显示时默认靠左或靠右；拖动后会优先记住当前位置。',
    enumChoices: ['left', 'right'],
  },
]

const INTERNAL_SETTINGS = {
  panelVisible: '__panelVisible',
  expandedKeys: '__expandedKeys',
  autoRefreshPaused: '__autoRefreshPaused',
  bodyScrollTop: '__bodyScrollTop',
  lastLocatedNodeKey: '__lastLocatedNodeKey',
  viewMode: '__viewMode',
  panelX: '__panelX',
  panelY: '__panelY',
  bubbleX: '__bubbleX',
  bubbleY: '__bubbleY',
} as const

const DEFAULT_POLL_INTERVAL_SECONDS = 5
const REFRESH_DEBOUNCE_MS = 250
const MAIN_UI_MARGIN = 12
const PANEL_TOP_OFFSET = 56
const PANEL_MIN_HEIGHT = 360
const PANEL_MAX_HEIGHT = 720
const BUBBLE_SIZE = 56
const DRAG_THRESHOLD_PX = 4
class FavoriteTreePlugin {
  private readonly root: HTMLElement
  private panelVisible = false
  private viewMode: ViewMode = 'panel'
  private refreshing = false
  private currentPageName: string | null = null
  private currentThemeMode: ThemeMode = 'light'
  private rootFavorites: string[] = []
  private autoRefreshPaused = false
  private bodyScrollTop = 0
  private lastLocatedNodeKey: string | null = null
  private flashLocatedNodeKey: string | null = null
  private panelX = MAIN_UI_MARGIN
  private panelY = PANEL_TOP_OFFSET
  private bubbleX = MAIN_UI_MARGIN
  private bubbleY = 120
  private dragState: DragState | null = null
  private suppressBubbleClick = false
  private dragFrameId: number | null = null
  private readonly expandedKeys = new Set<string>()
  private readonly loadedKeys = new Set<string>()
  private readonly loadStates = new Map<string, LoadState>()
  private readonly loadErrors = new Map<string, string>()
  private readonly pageByKey = new Map<string, PageEntity>()
  private childIndex: Map<string, string[]> | null = null
  private childIndexPromise: Promise<void> | null = null
  private refreshTimerId: number | null = null
  private routeTimerId: number | null = null
  private pollTimerId: number | null = null
  private flashTimerId: number | null = null
  private lastRefreshLabel = '尚未刷新'
  private offHooks: Array<() => void> = []

  constructor(root: HTMLElement) {
    this.root = root
  }

  async init(): Promise<void> {
    this.panelVisible = this.getBooleanSetting(INTERNAL_SETTINGS.panelVisible, true)
    this.autoRefreshPaused = this.getBooleanSetting(INTERNAL_SETTINGS.autoRefreshPaused, false)
    this.bodyScrollTop = this.getNumberSetting(INTERNAL_SETTINGS.bodyScrollTop, 0)
    this.lastLocatedNodeKey = this.getStringSetting(INTERNAL_SETTINGS.lastLocatedNodeKey)
    this.viewMode = this.getViewModeSetting()
    this.restoreFloatingState()
    for (const key of this.getStringArraySetting(INTERNAL_SETTINGS.expandedKeys)) {
      this.expandedKeys.add(key)
      this.loadedKeys.add(key)
    }

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
    this.dragState = null
    document.body.classList.remove('is-dragging')
    if (this.dragFrameId !== null) {
      window.cancelAnimationFrame(this.dragFrameId)
      this.dragFrameId = null
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
    this.ensureFloatingElementsInViewport()
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
    this.ensureFloatingElementsInViewport()
    this.persistInternalState()
    this.applyMainUIState()
    this.render()
  }

  expandFromBubble = async (): Promise<void> => {
    this.panelVisible = true
    this.viewMode = 'panel'
    this.ensureFloatingElementsInViewport()
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

  toggleExpandCollapseAll = async (): Promise<void> => {
    if (this.hasExpandedNodes()) {
      this.collapseAll()
      return
    }
    await this.expandAll()
  }

  expandAll = async (): Promise<void> => {
    await this.ensureChildIndex()

    for (const key of this.collectReachableExpandableKeys()) {
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

    await this.ensureChildIndex()
    const path = this.findPathToPage(this.currentPageName)
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
    const isExpanded = this.expandedKeys.has(nodeKey)
    if (isExpanded) {
      this.expandedKeys.delete(nodeKey)
      this.persistInternalState()
      this.render()
      return
    }

    this.expandedKeys.add(nodeKey)
    this.persistInternalState()
    this.render()

    if (!this.loadedKeys.has(nodeKey)) {
      this.loadStates.set(nodeKey, 'loading')
      this.loadErrors.delete(nodeKey)
      this.render()

      try {
        await this.ensureChildIndex()
        this.loadedKeys.add(nodeKey)
        this.loadStates.set(nodeKey, 'loaded')
      } catch (error) {
        this.loadStates.set(nodeKey, 'error')
        this.loadErrors.set(nodeKey, error instanceof Error ? error.message : '子节点加载失败')
      }

      this.render()
    }
  }

  openPage = (pageName: string): void => {
    logseq.App.pushState('page', { name: pageName })
  }

  startDrag(kind: DragKind, event: PointerEvent, handleElement?: HTMLElement | null): void {
    if (event.button !== 0) {
      return
    }

    const origin = kind === 'panel' ? { x: this.panelX, y: this.panelY } : { x: this.bubbleX, y: this.bubbleY }
    handleElement?.setPointerCapture?.(event.pointerId)
    this.dragState = {
      kind,
      pointerId: event.pointerId,
      startScreenX: event.screenX,
      startScreenY: event.screenY,
      originX: origin.x,
      originY: origin.y,
      moved: false,
      handleElement: handleElement ?? null,
    }

    document.body.classList.add('is-dragging')
    event.preventDefault()
  }

  shouldIgnoreBubbleClick(): boolean {
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
        this.scheduleRefresh('graph-changed')
      }),
    )

    this.offHooks.push(
      logseq.onSettingsChanged<PluginSettings>((newSettings, oldSettings) => {
        const propertyChanged = newSettings.hierarchyProperty !== oldSettings?.hierarchyProperty
        const widthChanged = newSettings.panelWidth !== oldSettings?.panelWidth
        const pollIntervalChanged = newSettings.pollIntervalSeconds !== oldSettings?.pollIntervalSeconds
        const positionChanged = newSettings.sidebarPosition !== oldSettings?.sidebarPosition

        if (propertyChanged) {
          this.invalidateIndex()
          void this.refresh('settings-property')
        }

        if (widthChanged || positionChanged) {
          this.ensureFloatingElementsInViewport()
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

    const pollIntervalMs = this.getPollIntervalSeconds() * 1000
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
      this.rootFavorites = await this.loadFavoriteRoots()
      this.invalidateIndex()

      if (this.hasExpandedNodes()) {
        await this.ensureChildIndex()
        for (const key of this.expandedKeys) {
          this.loadedKeys.add(key)
          this.loadStates.set(key, 'loaded')
          this.loadErrors.delete(key)
        }
      }

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

  private async loadFavoriteRoots(): Promise<string[]> {
    const directFavorites = await logseq.App.getCurrentGraphFavorites()
    const configFavorites = await this.loadFavoritesFromConfigs()
    const favorites = [
      ...normalizeFavoriteSeeds(directFavorites),
      ...normalizeFavoriteSeeds(configFavorites),
    ]
    const seen = new Set<string>()
    const resolved: string[] = []

    for (const favorite of favorites) {
      const normalizedSeed = normalizeFavoriteSeed(favorite)
      const normalized = normalizeTitle(normalizedSeed)
      if (!normalized || seen.has(normalized)) {
        continue
      }

      const page = await this.resolveFavoritePage(normalizedSeed)
      const title = pageTitle(page) ?? normalizedSeed
      const titleKey = normalizeTitle(title)
      if (!titleKey || seen.has(titleKey)) {
        continue
      }
      seen.add(titleKey)
      resolved.push(title)
    }

    return resolved
  }

  private async loadFavoritesFromConfigs(): Promise<unknown> {
    try {
      const configs = await logseq.App.getCurrentGraphConfigs(
        'favorites',
        ':favorites',
        'ui/favorites',
        ':ui/favorites',
      )
      return configs ?? null
    } catch {
      return null
    }
  }

  private async resolveFavoritePage(seed: string): Promise<PageEntity | null> {
    const direct = await logseq.Editor.getPage(seed)
    if (direct) {
      return direct
    }

    const unwrapped = unwrapPageRef(seed)
    if (unwrapped !== seed) {
      const fromRef = await logseq.Editor.getPage(unwrapped)
      if (fromRef) {
        return fromRef
      }
    }

    return null
  }

  private invalidateIndex(): void {
    this.childIndex = null
    this.childIndexPromise = null
    this.pageByKey.clear()
  }

  private async ensureChildIndex(): Promise<void> {
    if (this.childIndex) {
      return
    }
    if (this.childIndexPromise) {
      await this.childIndexPromise
      return
    }

    this.childIndexPromise = this.buildChildIndex()
    await this.childIndexPromise
    this.childIndexPromise = null
  }

  private async buildChildIndex(): Promise<void> {
    const allPages = (await logseq.Editor.getAllPages()) ?? []
    const propertyName = this.getHierarchyProperty()
    const index = new Map<string, string[]>()

    this.pageByKey.clear()
    for (const page of allPages) {
      const title = pageTitle(page)
      if (!title) {
        continue
      }
      this.pageByKey.set(normalizeTitle(title), page)
    }

    for (const page of allPages) {
      const title = pageTitle(page)
      if (!title) {
        continue
      }

      for (const parentTitle of await this.resolveParentTitles(page, propertyName)) {
        const parentKey = normalizeTitle(parentTitle)
        if (!parentKey) {
          continue
        }
        const existing = index.get(parentKey) ?? []
        if (!existing.includes(title)) {
          existing.push(title)
          index.set(parentKey, existing)
        }
      }
    }

    for (const [key, children] of index.entries()) {
      index.set(
        key,
        [...children].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN', { sensitivity: 'base' })),
      )
    }

    this.childIndex = index
  }

  private async resolveParentTitles(page: PageEntity, propertyName: string): Promise<string[]> {
    const properties =
      page.properties && typeof page.properties === 'object'
        ? (page.properties as Record<string, unknown>)
        : null
    const rawFromPage = properties ? findPropertyValue(properties, propertyName) : undefined
    const rawFromTopLevel = (page as Record<string, unknown>)[propertyName]
    let rawFromApi: unknown = undefined
    let rawFromAllProps: unknown = undefined

    if (rawFromPage == null && rawFromTopLevel == null) {
      try {
        rawFromApi = await logseq.Editor.getBlockProperty(page.uuid, propertyName)
      } catch {
        rawFromApi = undefined
      }
    }

    if (rawFromPage == null && rawFromTopLevel == null && rawFromApi == null) {
      try {
        const allProps = await logseq.Editor.getBlockProperties(page.uuid)
        if (allProps && typeof allProps === 'object') {
          rawFromAllProps = findPropertyValue(allProps as Record<string, unknown>, propertyName)
        }
      } catch {
        rawFromAllProps = undefined
      }
    }

    return uniqueTitlesFromValues([rawFromPage, rawFromTopLevel, rawFromApi, rawFromAllProps])
  }

  private async updateCurrentPage(): Promise<void> {
    const current = await logseq.Editor.getCurrentPage()
    const nextTitle = current && typeof current === 'object' ? pageTitle(current as PageEntity) : null
    this.currentPageName = nextTitle
    this.render()
  }

  private render(): void {
    this.captureBodyScrollTop()

    if (this.viewMode === 'bubble') {
      const countLabel = this.rootFavorites.length > 99 ? '99+' : String(this.rootFavorites.length)
      this.root.innerHTML = `
        <button
          class="favorite-tree-bubble ${this.refreshing ? 'is-refreshing' : ''}"
          data-action="expand-panel"
          data-drag-handle="bubble"
          title="点击展开收藏夹树，拖拽可移动位置"
          aria-label="展开收藏夹树"
        >
          <span class="favorite-tree-bubble__icon">★</span>
          <span class="favorite-tree-bubble__count">${escapeHtml(countLabel)}</span>
        </button>
      `
      return
    }

    const autoRefreshActionLabel = this.autoRefreshPaused ? '恢复自动刷新' : '暂停自动刷新'
    const autoRefreshActionIcon = this.autoRefreshPaused ? '▶' : '⏸'
    const autoRefreshState = this.autoRefreshPaused
      ? '自动刷新已暂停'
      : `自动刷新 ${this.getPollIntervalSeconds()}s`
    const hasExpandedNodes = this.hasExpandedNodes()
    const expandActionLabel = hasExpandedNodes ? '折叠' : '展开'
    const expandActionTitle = hasExpandedNodes ? '折叠所有已展开目录' : '展开所有已匹配目录'

    const rootMarkup = this.rootFavorites.length
      ? this.rootFavorites.map((title) => this.renderNode(title, 0, [])).join('')
      : '<div class="favorite-tree__status">当前没有收藏页面。先把页面加入 Logseq 收藏夹，插件才会把它们作为树根显示。</div>'

    const bodyMarkup = this.refreshing && !this.rootFavorites.length
      ? '<div class="favorite-tree__status">正在加载收藏树...</div>'
      : rootMarkup

    this.root.innerHTML = `
      <div class="favorite-tree">
        <div class="favorite-tree__header" data-drag-handle="panel">
          <div class="favorite-tree__header-main">
            <h1 class="favorite-tree__title">收藏夹树</h1>
            <p class="favorite-tree__subtitle">拖动标题栏移动 · 属性 <code>${escapeHtml(this.getHierarchyProperty())}</code></p>
          </div>
          <div class="favorite-tree__actions">
            <button class="favorite-tree__icon-btn" data-action="refresh" title="手动刷新">↻</button>
            <button class="favorite-tree__icon-btn" data-action="collapse-to-bubble" title="收回为悬浮球">○</button>
            <button class="favorite-tree__icon-btn" data-action="settings" title="打开设置">⚙</button>
            <button class="favorite-tree__icon-btn" data-action="close" title="隐藏插件">×</button>
          </div>
        </div>
        <div class="favorite-tree__toolbar">
          <button class="favorite-tree__text-btn" data-action="locate-current" title="快速定位当前页">定位</button>
          <button class="favorite-tree__text-btn ${hasExpandedNodes ? 'is-active' : ''}" data-action="toggle-expand-all" title="${expandActionTitle}">${expandActionLabel}</button>
          <button
            class="favorite-tree__text-btn ${this.autoRefreshPaused ? 'is-active' : ''}"
            data-action="toggle-auto-refresh"
            title="${autoRefreshActionLabel}"
            aria-pressed="${this.autoRefreshPaused ? 'true' : 'false'}"
          >${autoRefreshActionIcon} 自动刷新</button>
        </div>
        <div class="favorite-tree__body">${bodyMarkup}</div>
        <div class="favorite-tree__footer">
          <span>${escapeHtml(this.lastRefreshLabel)}</span>
          <span>${this.refreshing ? '刷新中...' : `${autoRefreshState} · ${this.rootFavorites.length} 个根节点`}</span>
        </div>
      </div>
    `

    const nextBody = this.getBodyElement()
    if (nextBody) {
      nextBody.scrollTop = this.bodyScrollTop
      nextBody.addEventListener('scroll', this.handleBodyScroll, { passive: true })
    }
  }

  private renderNode(title: string, depth: number, ancestors: string[]): string {
    const key = normalizeTitle(title)
    const isCurrent = key === normalizeTitle(this.currentPageName)
    const isLocated = key === this.lastLocatedNodeKey
    const isFlashing = key === this.flashLocatedNodeKey
    const isExpanded = this.expandedKeys.has(key)
    const loadState = this.loadStates.get(key) ?? 'idle'
    const children = this.getChildrenFor(title)
    const hasKnownChildren = children.length > 0
    const statusHint = this.renderNodeHint(key, depth, isExpanded, loadState, hasKnownChildren)

    let childrenMarkup = ''
    if (isExpanded && loadState !== 'loading' && loadState !== 'error' && hasKnownChildren) {
      const nextAncestors = [...ancestors, key]
      childrenMarkup = `<div class="tree-node__children">${children
        .map((childTitle) => {
          const childKey = normalizeTitle(childTitle)
          if (nextAncestors.includes(childKey)) {
            return this.renderCycleNode(childTitle, depth + 1)
          }
          return this.renderNode(childTitle, depth + 1, nextAncestors)
        })
        .join('')}</div>`
    }

    const chevron = isExpanded ? '▾' : '▸'

    return `
      <div class="tree-node" data-node-key="${escapeHtml(key)}">
        <div class="tree-node__row ${isCurrent ? 'is-current' : ''} ${isLocated ? 'is-located' : ''} ${isFlashing ? 'is-flashing' : ''}" style="--depth:${depth}">
          <button class="tree-node__toggle" data-action="toggle-node" data-key="${escapeHtml(key)}" title="展开或折叠">${chevron}</button>
          <button class="tree-node__title" data-action="open-page" data-page="${escapeHtml(title)}" title="打开页面 ${escapeHtml(
            title,
          )}">
            <span class="tree-node__title-text">${escapeHtml(title)}</span>
          </button>
          <span class="tree-node__meta">${isCurrent ? '<span class="tree-node__badge">当前页</span>' : ''}${isLocated ? '<span class="tree-node__badge">定位</span>' : ''}</span>
        </div>
        ${statusHint}
        ${childrenMarkup}
      </div>
    `
  }

  private renderCycleNode(title: string, depth: number): string {
    return `
      <div class="tree-node" data-node-key="${escapeHtml(normalizeTitle(title))}">
        <div class="tree-node__row is-cycle" style="--depth:${depth}">
          <span class="tree-node__toggle">•</span>
          <button class="tree-node__title" data-action="open-page" data-page="${escapeHtml(title)}" title="打开页面 ${escapeHtml(
            title,
          )}">
            <span class="tree-node__title-text">${escapeHtml(title)}</span>
          </button>
          <span class="tree-node__meta"><span class="tree-node__badge">循环</span></span>
        </div>
        <div class="tree-node__hint" style="--depth:${depth}">检测到循环引用，已停止继续向下递归。</div>
      </div>
    `
  }

  private renderNodeHint(key: string, depth: number, isExpanded: boolean, loadState: LoadState, hasKnownChildren: boolean): string {
    if (!isExpanded) {
      return ''
    }

    if (loadState === 'loading') {
      return `<div class="tree-node__hint" style="--depth:${depth}">首次展开时正在按属性关系加载子节点...</div>`
    }

    if (loadState === 'error') {
      const message = this.loadErrors.get(key) ?? '子节点加载失败'
      return `<div class="tree-node__hint" style="--depth:${depth}">${escapeHtml(message)}</div>`
    }

    if (this.loadedKeys.has(key) && !hasKnownChildren) {
      return `<div class="tree-node__hint" style="--depth:${depth}">未发现直接子页面。</div>`
    }

    return ''
  }

  private getChildrenFor(title: string): string[] {
    if (!this.childIndex) {
      return []
    }
    return this.childIndex.get(normalizeTitle(title)) ?? []
  }

  private hasExpandedNodes(): boolean {
    return this.expandedKeys.size > 0
  }

  private collectReachableExpandableKeys(): string[] {
    const keys = new Set<string>()

    for (const root of this.rootFavorites) {
      this.collectExpandableKeysFrom(root, [], keys)
    }

    return [...keys]
  }

  private collectExpandableKeysFrom(title: string, ancestors: string[], output: Set<string>): void {
    const key = normalizeTitle(title)
    if (!key || ancestors.includes(key)) {
      return
    }

    const children = this.getChildrenFor(title)
    if (!children.length) {
      return
    }

    output.add(key)
    const nextAncestors = [...ancestors, key]
    for (const child of children) {
      this.collectExpandableKeysFrom(child, nextAncestors, output)
    }
  }

  private findPathToPage(targetTitle: string): string[] | null {
    const targetKey = normalizeTitle(targetTitle)
    if (!targetKey) {
      return null
    }

    for (const root of this.rootFavorites) {
      const path = this.findPathFromNode(root, targetKey, [])
      if (path) {
        return path
      }
    }

    return null
  }

  private findPathFromNode(title: string, targetKey: string, ancestors: string[]): string[] | null {
    const key = normalizeTitle(title)
    if (!key || ancestors.includes(key)) {
      return null
    }

    const nextPath = [...ancestors, title]
    if (key === targetKey) {
      return nextPath
    }

    for (const child of this.getChildrenFor(title)) {
      const path = this.findPathFromNode(child, targetKey, nextPath)
      if (path) {
        return path
      }
    }

    return null
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

  private getHierarchyProperty(): string {
    const settings = logseq.settings as PluginSettings | undefined
    const value = settings?.hierarchyProperty
    return typeof value === 'string' && value.trim() ? value.trim() : 'parent'
  }

  private getSidebarPosition(): 'left' | 'right' {
    const settings = logseq.settings as PluginSettings | undefined
    return settings?.sidebarPosition === 'right' ? 'right' : 'left'
  }

  private getPanelWidth(): number {
    const settings = logseq.settings as PluginSettings | undefined
    const raw = settings?.panelWidth
    const numeric = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(numeric)) {
      return 320
    }
    return Math.min(640, Math.max(240, numeric))
  }

  private getPollIntervalSeconds(): number {
    const settings = logseq.settings as PluginSettings | undefined
    const raw = settings?.pollIntervalSeconds
    const numeric = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(numeric)) {
      return DEFAULT_POLL_INTERVAL_SECONDS
    }
    return Math.min(3600, Math.max(1, Math.round(numeric)))
  }

  private getBooleanSetting(key: string, fallback: boolean): boolean {
    const settings = logseq.settings as PluginSettings | undefined
    const value = settings?.[key]
    return typeof value === 'boolean' ? value : fallback
  }

  private getNumberSetting(key: string, fallback: number): number {
    const settings = logseq.settings as PluginSettings | undefined
    const value = settings?.[key]
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : fallback
  }

  private getStringSetting(key: string): string | null {
    const settings = logseq.settings as PluginSettings | undefined
    const value = settings?.[key]
    return typeof value === 'string' && value.trim() ? value : null
  }

  private getStringArraySetting(key: string): string[] {
    const settings = logseq.settings as PluginSettings | undefined
    const value = settings?.[key]
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  }

  private getViewModeSetting(): ViewMode {
    return this.getStringSetting(INTERNAL_SETTINGS.viewMode) === 'bubble' ? 'bubble' : 'panel'
  }

  private persistInternalState(): void {
    logseq.updateSettings({
      [INTERNAL_SETTINGS.panelVisible]: this.panelVisible,
      [INTERNAL_SETTINGS.expandedKeys]: [...this.expandedKeys],
      [INTERNAL_SETTINGS.autoRefreshPaused]: this.autoRefreshPaused,
      [INTERNAL_SETTINGS.bodyScrollTop]: Math.max(0, Math.round(this.bodyScrollTop)),
      [INTERNAL_SETTINGS.lastLocatedNodeKey]: this.lastLocatedNodeKey,
      [INTERNAL_SETTINGS.viewMode]: this.viewMode,
      [INTERNAL_SETTINGS.panelX]: Math.round(this.panelX),
      [INTERNAL_SETTINGS.panelY]: Math.round(this.panelY),
      [INTERNAL_SETTINGS.bubbleX]: Math.round(this.bubbleX),
      [INTERNAL_SETTINGS.bubbleY]: Math.round(this.bubbleY),
    })
  }

  private applyMainUIState(): void {
    logseq.setMainUIAttrs({
      draggable: false,
      resizable: false,
    })

    this.ensureFloatingElementsInViewport()
    const frame = this.viewMode === 'bubble' ? this.getBubbleFrame() : this.getPanelFrame()

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

  private readonly handleBodyScroll = (): void => {
    const body = this.getBodyElement()
    if (!body) {
      return
    }

    this.bodyScrollTop = body.scrollTop
  }

  private readonly handleWindowResize = (): void => {
    this.ensureFloatingElementsInViewport()
    this.applyMainUIState()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return
    }

    const nextX = this.dragState.originX + event.screenX - this.dragState.startScreenX
    const nextY = this.dragState.originY + event.screenY - this.dragState.startScreenY

    if (
      !this.dragState.moved &&
      (Math.abs(event.screenX - this.dragState.startScreenX) >= DRAG_THRESHOLD_PX ||
        Math.abs(event.screenY - this.dragState.startScreenY) >= DRAG_THRESHOLD_PX)
    ) {
      this.dragState.moved = true
    }

    if (this.dragState.kind === 'panel') {
      const panel = this.getClampedPosition(nextX, nextY, this.getPanelWidth(), this.getPanelHeight())
      this.panelX = panel.x
      this.panelY = panel.y
    } else {
      const bubble = this.getClampedPosition(nextX, nextY, BUBBLE_SIZE, BUBBLE_SIZE)
      this.bubbleX = bubble.x
      this.bubbleY = bubble.y
    }

    if (this.dragFrameId !== null) {
      return
    }

    this.dragFrameId = window.requestAnimationFrame(() => {
      this.dragFrameId = null
      this.applyMainUIState()
    })
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return
    }

    if (this.dragFrameId !== null) {
      window.cancelAnimationFrame(this.dragFrameId)
      this.dragFrameId = null
    }
    this.applyMainUIState()
    this.suppressBubbleClick = this.dragState.kind === 'bubble' && this.dragState.moved
    this.dragState.handleElement?.releasePointerCapture?.(event.pointerId)
    this.dragState = null
    document.body.classList.remove('is-dragging')
    this.persistInternalState()
  }

  private captureBodyScrollTop(): void {
    const body = this.getBodyElement()
    if (!body) {
      return
    }
    this.bodyScrollTop = body.scrollTop
  }

  private restoreFloatingState(): void {
    const viewport = this.getViewportSize()
    const panelDefaults = this.getDefaultPanelPosition(viewport.width, viewport.height)
    const bubbleDefaults = this.getDefaultBubblePosition(viewport.width, viewport.height)

    this.panelX = this.getNumberSetting(INTERNAL_SETTINGS.panelX, panelDefaults.x)
    this.panelY = this.getNumberSetting(INTERNAL_SETTINGS.panelY, panelDefaults.y)
    this.bubbleX = this.getNumberSetting(INTERNAL_SETTINGS.bubbleX, bubbleDefaults.x)
    this.bubbleY = this.getNumberSetting(INTERNAL_SETTINGS.bubbleY, bubbleDefaults.y)
    this.ensureFloatingElementsInViewport()
  }

  private ensureFloatingElementsInViewport(): void {
    const panel = this.getClampedPosition(this.panelX, this.panelY, this.getPanelWidth(), this.getPanelHeight())
    const bubble = this.getClampedPosition(this.bubbleX, this.bubbleY, BUBBLE_SIZE, BUBBLE_SIZE)
    this.panelX = panel.x
    this.panelY = panel.y
    this.bubbleX = bubble.x
    this.bubbleY = bubble.y
  }

  private getViewportSize(): { width: number; height: number } {
    try {
      const target = window.parent ?? window
      return {
        width: Math.max(320, target.innerWidth || window.innerWidth || document.documentElement.clientWidth || 1280),
        height: Math.max(320, target.innerHeight || window.innerHeight || document.documentElement.clientHeight || 800),
      }
    } catch {
      return {
        width: Math.max(320, window.innerWidth || document.documentElement.clientWidth || 1280),
        height: Math.max(320, window.innerHeight || document.documentElement.clientHeight || 800),
      }
    }
  }

  private getPanelHeight(): number {
    const viewport = this.getViewportSize()
    return Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, viewport.height - MAIN_UI_MARGIN * 2))
  }

  private getPanelFrame(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.panelX,
      y: this.panelY,
      width: this.getPanelWidth(),
      height: this.getPanelHeight(),
    }
  }

  private getBubbleFrame(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.bubbleX,
      y: this.bubbleY,
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
    }
  }

  private getDefaultPanelPosition(viewportWidth: number, viewportHeight: number): { x: number; y: number } {
    const width = this.getPanelWidth()
    const height = Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, viewportHeight - MAIN_UI_MARGIN * 2))
    const x = this.getSidebarPosition() === 'right' ? viewportWidth - width - MAIN_UI_MARGIN : MAIN_UI_MARGIN
    return this.getClampedPosition(x, PANEL_TOP_OFFSET, width, height)
  }

  private getDefaultBubblePosition(viewportWidth: number, viewportHeight: number): { x: number; y: number } {
    const x =
      this.getSidebarPosition() === 'right'
        ? viewportWidth - BUBBLE_SIZE - MAIN_UI_MARGIN
        : MAIN_UI_MARGIN
    const y = viewportHeight - BUBBLE_SIZE - 96
    return this.getClampedPosition(x, y, BUBBLE_SIZE, BUBBLE_SIZE)
  }

  private getClampedPosition(x: number, y: number, width: number, height: number): { x: number; y: number } {
    const viewport = this.getViewportSize()
    const maxX = Math.max(MAIN_UI_MARGIN, viewport.width - width - MAIN_UI_MARGIN)
    const maxY = Math.max(MAIN_UI_MARGIN, viewport.height - height - MAIN_UI_MARGIN)

    return {
      x: Math.round(Math.min(maxX, Math.max(MAIN_UI_MARGIN, x))),
      y: Math.round(Math.min(maxY, Math.max(MAIN_UI_MARGIN, y))),
    }
  }

  private syncTheme(): void {
    const fallbacks =
      this.currentThemeMode === 'dark'
        ? {
            bg: '#111827',
            bgMuted: '#1f2937',
            border: '#374151',
            text: '#f3f4f6',
            textMuted: '#9ca3af',
            accent: '#60a5fa',
            shadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
          }
        : {
            bg: '#ffffff',
            bgMuted: '#f5f7fb',
            border: '#d7dce5',
            text: '#1f2937',
            textMuted: '#6b7280',
            accent: '#2563eb',
            shadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
          }

    const lookup = (names: string[], fallback: string): string => {
      try {
        const target = window.parent?.document?.documentElement
        if (!target) {
          return fallback
        }
        const styles = window.parent.getComputedStyle(target)
        for (const name of names) {
          const value = styles.getPropertyValue(name).trim()
          if (value) {
            return value
          }
        }
      } catch {
        return fallback
      }
      return fallback
    }

    document.documentElement.style.setProperty('--ft-bg', lookup(['--ls-primary-background-color'], fallbacks.bg))
    document.documentElement.style.setProperty(
      '--ft-bg-muted',
      lookup(['--ls-secondary-background-color', '--ls-tertiary-background-color'], fallbacks.bgMuted),
    )
    document.documentElement.style.setProperty('--ft-border', lookup(['--ls-border-color'], fallbacks.border))
    document.documentElement.style.setProperty('--ft-text', lookup(['--ls-primary-text-color'], fallbacks.text))
    document.documentElement.style.setProperty(
      '--ft-text-muted',
      lookup(['--ls-secondary-text-color', '--ls-page-properties-text-color'], fallbacks.textMuted),
    )
    document.documentElement.style.setProperty(
      '--ft-accent',
      lookup(['--ls-link-text-color', '--ls-active-primary-color'], fallbacks.accent),
    )
    document.documentElement.style.setProperty('--ft-shadow', fallbacks.shadow)
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

function pageTitle(page: Partial<PageEntity> | null | undefined): string | null {
  if (!page || typeof page !== 'object') {
    return null
  }

  const original = typeof page.originalName === 'string' ? page.originalName.trim() : ''
  if (original) {
    return original
  }

  const name = typeof page.name === 'string' ? page.name.trim() : ''
  return name || null
}

function normalizeTitle(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''
}

function normalizeFavoriteSeeds(value: unknown): string[] {
  if (value == null) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeFavoriteSeeds(item))
  }

  if (typeof value === 'string') {
    const normalized = normalizeFavoriteSeed(value)
    return normalized ? [normalized] : []
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const candidates = [
      record.name,
      record.originalName,
      record.page,
      record.title,
      record.label,
    ]

    for (const candidate of candidates) {
      const normalized = normalizeFavoriteSeed(candidate)
      if (normalized) {
        return [normalized]
      }
    }

    if (record.id) {
      const normalized = normalizeFavoriteSeed(record.id)
      if (normalized) {
        return [normalized]
      }
    }
  }

  return []
}

function normalizeFavoriteSeed(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const routeMatch = trimmed.match(/(?:^|\/)page\/(.+)$/i)
  if (routeMatch?.[1]) {
    return decodeURIComponent(routeMatch[1]).trim()
  }

  return unwrapPageRef(trimmed)
}

function unwrapPageRef(value: string): string {
  const trimmed = value.trim()
  const refMatch = trimmed.match(/^\[\[([\s\S]+)\]\]$/)
  if (refMatch?.[1]) {
    return refMatch[1].trim()
  }
  return trimmed
}

function uniqueTitlesFromValues(values: unknown[]): string[] {
  const unique = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    for (const title of normalizePropertyReferences(value)) {
      const normalized = normalizeTitle(title)
      if (!normalized || unique.has(normalized)) {
        continue
      }
      unique.add(normalized)
      result.push(title)
    }
  }

  return result
}

function findPropertyValue(properties: Record<string, unknown>, propertyName: string): unknown {
  if (propertyName in properties) {
    return properties[propertyName]
  }

  const target = normalizePropertyLookupKey(propertyName)
  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = normalizePropertyLookupKey(key)
    if (normalizedKey === target) {
      return value
    }

    const lastSegment = normalizedKey.split('/').pop() ?? normalizedKey
    if (lastSegment === target || lastSegment.startsWith(`${target}-`)) {
      return value
    }

    if (normalizedKey.includes(`/${target}-`) || normalizedKey.endsWith(`/${target}`)) {
      return value
    }
  }

  return undefined
}

function normalizePropertyLookupKey(value: string): string {
  return value.trim().replace(/^:/, '').toLocaleLowerCase()
}

function normalizePropertyReferences(value: unknown): string[] {
  if (value == null) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizePropertyReferences(item))
  }

  if (typeof value === 'string') {
    const linkedMatches = [...value.matchAll(/\[\[([^\]]+)\]\]/g)]
      .map((match) => match[1]?.trim())
      .filter((item): item is string => Boolean(item))
    if (linkedMatches.length > 0) {
      return linkedMatches
    }

    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>

    if (typeof record.originalName === 'string' && record.originalName.trim()) {
      return [record.originalName.trim()]
    }

    if (typeof record.name === 'string' && record.name.trim()) {
      return [record.name.trim()]
    }

    if (Array.isArray(record.title)) {
      const joined = record.title.join('').trim()
      return joined ? [joined] : []
    }

    if ('value' in record) {
      return normalizePropertyReferences(record.value)
    }
  }

  return []
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeSelectorValue(value: string): string {
  if (window.CSS?.escape) {
    return window.CSS.escape(value)
  }

  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function registerToolbar(model: FavoriteTreePlugin): void {
  logseq.provideModel({
    toggleFavoriteTree: model.togglePanel,
  })

  logseq.App.registerUIItem('toolbar', {
    key: 'db-favorite-tree-toggle',
    template: `
      <a class="button" data-on-click="toggleFavoriteTree" title="DB Favorite Tree" aria-label="DB Favorite Tree">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <path d="M8 12h8"></path>
          <path d="M8 16h5"></path>
        </svg>
      </a>
    `,
  })
}

function wireDOMEvents(model: FavoriteTreePlugin, root: HTMLElement): void {
  root.addEventListener('pointerdown', (event) => {
    const source = event.target as HTMLElement | null
    const handle = source?.closest<HTMLElement>('[data-drag-handle]')
    if (!handle) {
      return
    }

    const actionTarget = source?.closest<HTMLElement>('[data-action]')
    if (actionTarget && actionTarget !== handle) {
      return
    }

    const kind = handle.dataset.dragHandle
    if (kind === 'panel' || kind === 'bubble') {
      model.startDrag(kind, event, handle)
    }
  })

  root.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]')
    if (!target) {
      return
    }

    const action = target.dataset.action
    if (action === 'refresh') {
      void model.manualRefresh()
      return
    }
    if (action === 'toggle-auto-refresh') {
      model.toggleAutoRefresh()
      return
    }
    if (action === 'toggle-expand-all') {
      void model.toggleExpandCollapseAll()
      return
    }
    if (action === 'locate-current') {
      void model.locateCurrentPage()
      return
    }
    if (action === 'settings') {
      model.openSettings()
      return
    }
    if (action === 'collapse-to-bubble') {
      model.collapseToBubble()
      return
    }
    if (action === 'expand-panel') {
      if (model.shouldIgnoreBubbleClick()) {
        return
      }
      void model.expandFromBubble()
      return
    }
    if (action === 'close') {
      model.closePanel()
      return
    }
    if (action === 'toggle-node') {
      const key = target.dataset.key
      if (key) {
        void model.onNodeToggle(key)
      }
      return
    }
    if (action === 'open-page') {
      const page = target.dataset.page
      if (page) {
        model.openPage(page)
      }
    }
  })

  root.addEventListener('keydown', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action="expand-panel"]')
    if (!target) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (model.shouldIgnoreBubbleClick()) {
        return
      }
      void model.expandFromBubble()
    }
  })
}

async function main(): Promise<void> {
  logseq.useSettingsSchema(SETTINGS_SCHEMA)

  const root = document.getElementById('app')
  if (!root) {
    throw new Error('插件挂载点不存在')
  }

  const model = new FavoriteTreePlugin(root)
  wireDOMEvents(model, root)
  registerToolbar(model)
  logseq.beforeunload(async () => {
    model.destroy()
  })

  await model.init()
}

logseq.ready(main).catch((error) => {
  console.error(error)
  logseq.UI.showMsg(`DB Favorite Tree 启动失败: ${String(error)}`, 'error')
})
