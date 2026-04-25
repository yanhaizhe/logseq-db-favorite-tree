import '@logseq/libs'
import type { PageEntity, SettingSchemaDesc, ThemeMode } from '@logseq/libs/dist/LSPlugin'
import './style.css'

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

type PluginSettings = {
  hierarchyProperty?: string
  panelWidth?: number
  __panelVisible?: boolean
  __expandedKeys?: string[]
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
    description: '右侧收藏树面板宽度，单位为像素。',
  },
]

const INTERNAL_SETTINGS = {
  panelVisible: '__panelVisible',
  expandedKeys: '__expandedKeys',
} as const

const POLL_INTERVAL_MS = 5000
const REFRESH_DEBOUNCE_MS = 250

class FavoriteTreePlugin {
  private readonly root: HTMLElement
  private panelVisible = false
  private refreshing = false
  private currentPageName: string | null = null
  private currentThemeMode: ThemeMode = 'light'
  private rootFavorites: string[] = []
  private readonly expandedKeys = new Set<string>()
  private readonly loadedKeys = new Set<string>()
  private readonly loadStates = new Map<string, LoadState>()
  private readonly loadErrors = new Map<string, string>()
  private readonly pageByKey = new Map<string, PageEntity>()
  private debugSamples: Array<Record<string, unknown>> = []
  private childIndex: Map<string, string[]> | null = null
  private childIndexPromise: Promise<void> | null = null
  private refreshTimerId: number | null = null
  private routeTimerId: number | null = null
  private pollTimerId: number | null = null
  private lastRefreshLabel = '尚未刷新'
  private offHooks: Array<() => void> = []

  constructor(root: HTMLElement) {
    this.root = root
  }

  async init(): Promise<void> {
    this.panelVisible = this.getBooleanSetting(INTERNAL_SETTINGS.panelVisible, false)
    for (const key of this.getStringArraySetting(INTERNAL_SETTINGS.expandedKeys)) {
      this.expandedKeys.add(key)
      this.loadedKeys.add(key)
    }

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
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId)
    }
    if (this.routeTimerId !== null) {
      window.clearTimeout(this.routeTimerId)
    }
    if (this.pollTimerId !== null) {
      window.clearInterval(this.pollTimerId)
    }
    for (const off of this.offHooks) {
      off()
    }
  }

  togglePanel = async (): Promise<void> => {
    this.panelVisible = !this.panelVisible
    this.persistInternalState()
    this.applyMainUIState()
    this.render()

    if (this.panelVisible) {
      await this.refresh('panel-open')
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

  openSettings = (): void => {
    logseq.showSettingsUI()
  }

  manualRefresh = async (): Promise<void> => {
    await this.refresh('manual')
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

        if (propertyChanged) {
          this.invalidateIndex()
          void this.refresh('settings-property')
        }

        if (widthChanged) {
          this.applyMainUIState()
        }

        this.render()
      }),
    )
  }

  private startPolling(): void {
    this.pollTimerId = window.setInterval(() => {
      void this.refresh('poll')
    }, POLL_INTERVAL_MS)
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
    this.debugSamples = []
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
    const debugSamples: Array<Record<string, unknown>> = []

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

      const resolution = await this.resolveParentTitles(page, propertyName)
      const parentTitles = resolution.titles
      if (resolution.shouldLog && debugSamples.length < 30) {
        debugSamples.push({
          pageTitle: title,
          propertyName,
          propertyKeys: resolution.propertyKeys,
          rawFromPage: resolution.rawFromPage,
          rawFromTopLevel: resolution.rawFromTopLevel,
          rawFromApi: resolution.rawFromApi,
          rawFromAllProps: resolution.rawFromAllProps,
          resolvedParents: resolution.titles,
        })
      }

      for (const parentTitle of parentTitles) {
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
    this.debugSamples = debugSamples
    this.logChildIndexDebug(index, allPages.length, propertyName)
    if (debugSamples.length === 0) {
      await this.logNoMatchDiagnostics(allPages, propertyName)
    }
  }

  private async resolveParentTitles(page: PageEntity, propertyName: string): Promise<{
    titles: string[]
    propertyKeys: string[]
    rawFromPage: unknown
    rawFromTopLevel: unknown
    rawFromApi: unknown
    rawFromAllProps: unknown
    shouldLog: boolean
  }> {
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

    const titles = uniqueTitlesFromValues([rawFromPage, rawFromTopLevel, rawFromApi, rawFromAllProps])
    const propertyKeys = properties ? Object.keys(properties).slice(0, 20) : []
    const shouldLog =
      titles.length > 0 ||
      rawFromPage != null ||
      rawFromTopLevel != null ||
      rawFromApi != null ||
      rawFromAllProps != null

    return {
      titles,
      propertyKeys,
      rawFromPage: shrinkForDebug(rawFromPage),
      rawFromTopLevel: shrinkForDebug(rawFromTopLevel),
      rawFromApi: shrinkForDebug(rawFromApi),
      rawFromAllProps: shrinkForDebug(rawFromAllProps),
      shouldLog,
    }
  }

  private logChildIndexDebug(index: Map<string, string[]>, allPageCount: number, propertyName: string): void {
    const favoriteSummary = this.rootFavorites.map((root) => {
      const children = index.get(normalizeTitle(root)) ?? []
      return {
        root,
        childCount: children.length,
        children,
      }
    })

    const allRootsEmpty = favoriteSummary.every((item) => item.childCount === 0)
    if (!allRootsEmpty) {
      return
    }

    console.groupCollapsed('[DB Favorite Tree] Child lookup debug')
    console.info('hierarchyProperty:', propertyName)
    console.info('favoriteSummary:', favoriteSummary)
    console.info('allPageCount:', allPageCount)
    console.info('matchedSamples:', this.debugSamples)
    console.groupEnd()
  }

  private async logNoMatchDiagnostics(allPages: PageEntity[], propertyName: string): Promise<void> {
    const currentPage = await logseq.Editor.getCurrentPage()
    const currentTitle = currentPage && typeof currentPage === 'object' ? pageTitle(currentPage as PageEntity) : null
    const interestingTitles = [...new Set([...this.rootFavorites, ...(currentTitle ? [currentTitle] : [])])]

    const pageDiagnostics = await Promise.all(
      interestingTitles.map(async (title) => {
        const page = await logseq.Editor.getPage(title)
        const pageRecord = page && typeof page === 'object' ? (page as Record<string, unknown>) : null

        let blockPropertyValue: unknown = undefined
        let allPropsValue: unknown = undefined
        let allPropsKeys: string[] = []

        if (page?.uuid) {
          try {
            blockPropertyValue = await logseq.Editor.getBlockProperty(page.uuid, propertyName)
          } catch {
            blockPropertyValue = undefined
          }

          try {
            const allProps = await logseq.Editor.getBlockProperties(page.uuid)
            if (allProps && typeof allProps === 'object') {
              allPropsKeys = Object.keys(allProps as Record<string, unknown>).slice(0, 20)
              allPropsValue = findPropertyValue(allProps as Record<string, unknown>, propertyName)
            }
          } catch {
            allPropsValue = undefined
          }
        }

        const pageProperties =
          pageRecord?.properties && typeof pageRecord.properties === 'object'
            ? (pageRecord.properties as Record<string, unknown>)
            : null

        return {
          title,
          pageKeys: pageRecord ? Object.keys(pageRecord).slice(0, 30) : [],
          pagePropertyKeys: pageProperties ? Object.keys(pageProperties).slice(0, 20) : [],
          rawFromPageProperties: shrinkForDebug(pageProperties ? findPropertyValue(pageProperties, propertyName) : undefined),
          rawFromTopLevel: shrinkForDebug(pageRecord?.[propertyName]),
          rawFromGetBlockProperty: shrinkForDebug(blockPropertyValue),
          allPropsKeys,
          rawFromGetBlockProperties: shrinkForDebug(allPropsValue),
        }
      }),
    )

    const allPagesShape = allPages.slice(0, 10).map((page) => {
      const record = page as Record<string, unknown>
      const properties =
        record.properties && typeof record.properties === 'object'
          ? (record.properties as Record<string, unknown>)
          : null

      return {
        title: pageTitle(page),
        keys: Object.keys(record).slice(0, 20),
        propertyKeys: properties ? Object.keys(properties).slice(0, 20) : [],
      }
    })

    console.groupCollapsed('[DB Favorite Tree] No match diagnostics')
    console.info('hierarchyProperty:', propertyName)
    console.info('interestingPageDiagnostics:', pageDiagnostics)
    console.info('allPagesShapeSample:', allPagesShape)
    console.groupEnd()
  }

  private async updateCurrentPage(): Promise<void> {
    const current = await logseq.Editor.getCurrentPage()
    const nextTitle = current && typeof current === 'object' ? pageTitle(current as PageEntity) : null
    this.currentPageName = nextTitle
    this.render()
  }

  private render(): void {
    const rootMarkup = this.rootFavorites.length
      ? this.rootFavorites.map((title) => this.renderNode(title, 0, [])).join('')
      : '<div class="favorite-tree__status">当前没有收藏页面。先把页面加入 Logseq 收藏夹，插件才会把它们作为树根显示。</div>'

    const bodyMarkup = this.refreshing && !this.rootFavorites.length
      ? '<div class="favorite-tree__status">正在加载收藏树...</div>'
      : rootMarkup

    this.root.innerHTML = `
      <div class="favorite-tree">
        <div class="favorite-tree__header">
          <div class="favorite-tree__header-main">
            <h1 class="favorite-tree__title">收藏夹树</h1>
            <p class="favorite-tree__subtitle">根节点来自收藏夹，层级属性为 <code>${escapeHtml(
              this.getHierarchyProperty(),
            )}</code></p>
          </div>
          <div class="favorite-tree__actions">
            <button class="favorite-tree__icon-btn" data-action="refresh" title="手动刷新">↻</button>
            <button class="favorite-tree__icon-btn" data-action="settings" title="打开设置">⚙</button>
            <button class="favorite-tree__icon-btn" data-action="close" title="关闭面板">×</button>
          </div>
        </div>
        <div class="favorite-tree__body">${bodyMarkup}</div>
        <div class="favorite-tree__footer">
          <span>${escapeHtml(this.lastRefreshLabel)}</span>
          <span>${this.refreshing ? '刷新中...' : `${this.rootFavorites.length} 个根节点`}</span>
        </div>
      </div>
    `
  }

  private renderNode(title: string, depth: number, ancestors: string[]): string {
    const key = normalizeTitle(title)
    const isCurrent = key === normalizeTitle(this.currentPageName)
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
      <div class="tree-node">
        <div class="tree-node__row ${isCurrent ? 'is-current' : ''}" style="--depth:${depth}">
          <button class="tree-node__toggle" data-action="toggle-node" data-key="${escapeHtml(key)}" title="展开或折叠">${chevron}</button>
          <button class="tree-node__title" data-action="open-page" data-page="${escapeHtml(title)}" title="打开页面 ${escapeHtml(
            title,
          )}">
            <span class="tree-node__title-text">${escapeHtml(title)}</span>
          </button>
          <span class="tree-node__meta">${isCurrent ? '<span class="tree-node__badge">当前页</span>' : ''}</span>
        </div>
        ${statusHint}
        ${childrenMarkup}
      </div>
    `
  }

  private renderCycleNode(title: string, depth: number): string {
    return `
      <div class="tree-node">
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

  private getHierarchyProperty(): string {
    const settings = logseq.settings as PluginSettings | undefined
    const value = settings?.hierarchyProperty
    return typeof value === 'string' && value.trim() ? value.trim() : 'parent'
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

  private getBooleanSetting(key: string, fallback: boolean): boolean {
    const settings = logseq.settings as PluginSettings | undefined
    const value = settings?.[key]
    return typeof value === 'boolean' ? value : fallback
  }

  private getStringArraySetting(key: string): string[] {
    const settings = logseq.settings as PluginSettings | undefined
    const value = settings?.[key]
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  }

  private persistInternalState(): void {
    logseq.updateSettings({
      [INTERNAL_SETTINGS.panelVisible]: this.panelVisible,
      [INTERNAL_SETTINGS.expandedKeys]: [...this.expandedKeys],
    })
  }

  private applyMainUIState(): void {
    logseq.setMainUIAttrs({
      draggable: false,
      resizable: false,
    })

    logseq.setMainUIInlineStyle({
      position: 'fixed',
      top: '56px',
      right: '16px',
      width: `${this.getPanelWidth()}px`,
      height: 'calc(100vh - 72px)',
      maxHeight: 'calc(100vh - 72px)',
      zIndex: 90,
      overflow: 'hidden',
      borderRadius: '14px',
    })

    if (this.panelVisible) {
      logseq.showMainUI({ autoFocus: false })
      return
    }

    logseq.hideMainUI({ restoreEditingCursor: false })
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

function shrinkForDebug(value: unknown): unknown {
  if (value == null) {
    return value
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    if (typeof value === 'object') {
      return String(value)
    }
    return value
  }
}

function extractParentTitles(page: PageEntity, propertyName: string): string[] {
  const properties = page.properties
  if (!properties || typeof properties !== 'object') {
    return []
  }

  const rawValue = findPropertyValue(properties as Record<string, unknown>, propertyName)
  const titles = normalizePropertyReferences(rawValue)
  const unique = new Set<string>()
  const result: string[] = []

  for (const title of titles) {
    const normalized = normalizeTitle(title)
    if (!normalized || unique.has(normalized)) {
      continue
    }
    unique.add(normalized)
    result.push(title)
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
    if (action === 'settings') {
      model.openSettings()
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
